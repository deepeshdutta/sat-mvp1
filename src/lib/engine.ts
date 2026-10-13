import { QUESTIONS, Question, gradeNumeric } from '../data/questions'
import { DOMAINS, SKILLS, domainById, skillById } from '../data/taxonomy'
import { POLICY, RANGES } from './policy'
import { Attempt, DB, DAY, Mode, Plan, PlanCard, Report, Session, UserData, audit, now, track, uid, todayKey, currentUser } from './store'

// ---------------- content availability [F10] ----------------
export function qStatus(d: DB, q: Question) { return d.qStatus[q.id] ?? q.qa }
export function servable(d: DB) { return QUESTIONS.filter(q => qStatus(d, q) === 'published' && q.rights.commercial) }
export const qById = (id: string) => QUESTIONS.find(q => q.id === id)!

// ---------------- reports [F02] ----------------
export function validateReport(r: Partial<Report>): string[] {
  const e: string[] = []
  if (!r.type) e.push('Choose an assessment type.')
  if (!r.testDate) e.push('Enter the test date.')
  else if (new Date(r.testDate).getTime() > now() + DAY) e.push('Test date cannot be in the future.')
  if (r.type === 'other') { if (!r.sourceLabel?.trim()) e.push('Name the practice source (e.g. "Princeton Review Test 2").'); return e }
  const rg = r.type ? RANGES[r.type] : undefined
  if (!rg) return e
  const chk = (v: number | null | undefined, [lo, hi]: [number, number], name: string) => {
    if (v == null) return
    if (v < lo || v > hi) e.push(`${name} must be between ${lo} and ${hi} for ${rg.label}.`)
    else if (v % 10 !== 0) e.push(`${name} should be a multiple of 10.`)
  }
  chk(r.total, rg.total, 'Total'); chk(r.rw, rg.section, 'Reading and Writing'); chk(r.math, rg.section, 'Math')
  if (r.total != null && r.rw != null && r.math != null && r.rw + r.math !== r.total)
    e.push(`Your sections add to ${r.rw + r.math} but your total is ${r.total} — please check.`)
  return e
}
/** Default anchor = latest TEST date (not latest entry); learner may override. Deterministic tiebreak on entry time. */
export function anchorReport(u: UserData): Report | undefined {
  if (u.anchorOverride) { const r = u.reports.find(r => r.id === u.anchorOverride); if (r) return r }
  return [...u.reports].sort((a, b) => b.testDate.localeCompare(a.testDate) || b.enteredAt - a.enteredAt)[0]
}

// ---------------- evidence & mastery [F03][F07] ----------------
export const isEligible = (d: DB, a: Attempt) => a.firstExposure && a.assistance === 0 && !a.invalidatedAt && a.mode !== 'review' && qStatus(d, qById(a.qid)) === 'published'
export type SkillStatus = 'new' | 'practicing' | 'improving' | 'secured'
export interface SkillEvidence { skill: string; n: number; correct: number; last: Attempt[]; status: SkillStatus; sessions: number; mediumPlus: number; lastAt?: number; assistedN: number; assistedCorrect: number; stale: boolean; coverageGap: boolean; delayed?: { dueAt: number; state: string; result?: { correct: number; total: number } }; label: 'observed' | 'provisional' | 'practice-supported' | 'secured' | 'none' }

export function skillEvidence(d: DB, u: UserData, skill: string): SkillEvidence {
  const t = now()
  const all = u.attempts.filter(a => a.skill === skill && !a.invalidatedAt)
  const elig = all.filter(a => isEligible(d, a) && t - a.answeredAt < POLICY.staleDays * DAY).sort((a, b) => b.answeredAt - a.answeredAt)
  const stale = all.some(a => isEligible(d, a)) && elig.length === 0
  const assisted = all.filter(a => a.assistance > 0)
  const win = (n: number) => elig.slice(0, n)
  const meets = (p: { window: number; correct: number; sessions: number; mediumPlus: number }) => {
    const w = win(p.window); if (w.length < p.window) return false
    return w.filter(a => a.correct).length >= p.correct && new Set(w.map(a => a.sessionId)).size >= p.sessions && w.filter(a => a.difficulty >= 2).length >= p.mediumPlus
  }
  const dc = [...u.delayedChecks].filter(c => c.skill === skill).sort((a, b) => b.dueAt - a.dueAt)[0]
  let status: SkillStatus = elig.length === 0 ? 'new' : 'practicing'
  if (meets(POLICY.improving)) status = 'improving'
  if (status === 'improving' && meets(POLICY.secured) && dc?.state === 'done' && dc.result && dc.result.correct >= POLICY.delayedCheck.correct) status = 'secured'
  const pool = servable(d).filter(q => q.skill === skill && q.difficulty >= 2).length
  const coverageGap = pool < POLICY.secured.mediumPlus + POLICY.delayedCheck.items
  const w10 = win(10)
  const label: SkillEvidence['label'] = status === 'secured' ? 'secured' : elig.length === 0 ? (stale ? 'provisional' : 'none') : elig.length < 4 ? 'provisional' : w10.length >= 6 ? 'practice-supported' : 'observed'
  return { skill, n: w10.length, correct: w10.filter(a => a.correct).length, last: w10, status, sessions: new Set(w10.map(a => a.sessionId)).size, mediumPlus: w10.filter(a => a.difficulty >= 2).length, lastAt: elig[0]?.answeredAt, assistedN: assisted.length, assistedCorrect: assisted.filter(a => a.correct).length, stale, coverageGap, delayed: dc && { dueAt: dc.dueAt, state: dc.state, result: dc.result }, label }
}
export const allEvidence = (d: DB, u: UserData) => SKILLS.map(s => skillEvidence(d, u, s.id))

// ---------------- plan engine [F04] ----------------
const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
export function computePlan(d: DB, u: UserData, trigger: string): Plan {
  const anchor = anchorReport(u)
  const ev = allEvidence(d, u)
  const cards: PlanCard[] = []
  const prefW = (sec: string) => u.goals.sectionPreference === 'balanced' ? 1 : u.goals.sectionPreference === sec ? 1.25 : 0.85
  for (const e of ev) {
    if (e.status === 'secured') { const s = skillById(e.skill); cards.push({ key: e.skill, skill: e.skill, domain: s.domain, priority: 'low', evidence: 'secured', reason: 'Mastery thresholds and a delayed check were met.', evidenceRef: `${e.correct}/${e.n} independent · delayed check ${e.delayed?.result?.correct}/${e.delayed?.result?.total}`, nextAction: 'Occasional review only', reassess: 'Spot-check in 30 days', score: -1 }); continue }
    if (e.n === 0) continue
    const acc = e.correct / e.n
    const s = skillById(e.skill), dom = domainById(s.domain)
    const recency = e.lastAt && now() - e.lastAt < 7 * DAY ? 1.2 : 1
    const dueReview = u.notebook.some(m => m.skill === e.skill && m.state === 'open' && m.reviewDue <= now()) ? 1.1 : 1
    const shortfall = Math.max(0, POLICY.practiceTarget - acc)
    const score = shortfall * dom.share * recency * dueReview * prefW(dom.section)
    const misses = e.last.filter(a => !a.correct).length
    const reason = shortfall > 0
      ? `You answered ${e.correct} of ${e.n} recent independent ${s.name} questions correctly${misses >= 2 ? `, with ${misses} misses across recent sessions` : ''}.`
      : e.status === 'improving' ? `Improving: ${e.correct}/${e.n} on recent independent questions. Retention not yet confirmed.` : `Recent accuracy meets the practice target (${e.correct}/${e.n}); more evidence needed before it can be called improving.`
    cards.push({ key: e.skill, skill: e.skill, domain: s.domain, priority: score > 0.06 ? 'high' : score > 0.02 ? 'medium' : 'low', evidence: 'observed', reason, evidenceRef: `${e.correct}/${e.n} independent · ${e.mediumPlus} medium+ · last ${e.lastAt ? fmtDate(e.lastAt) : '—'}${e.coverageGap ? ' · additional evidence needed (item coverage)' : ''}`, nextAction: shortfall > 0 ? 'Start a focused workout' : e.status === 'improving' ? 'Schedule a delayed check' : 'Mixed practice', reassess: shortfall > 0 ? 'Start with two workouts, then reassess' : 'Reassess after next session', score })
  }
  // domain-level provisional cards: report bands choose where to investigate (ordinal only — never converted to %)
  for (const dom of DOMAINS) {
    const childObserved = ev.filter(e => skillById(e.skill).domain === dom.id && e.n > 0)
    const band = anchor?.bands[dom.id]
    if (childObserved.length >= 2) continue
    const unknownChildren = SKILLS.filter(s => s.domain === dom.id && !childObserved.find(c => c.skill === s.id)).map(s => s.name)
    if (band != null) {
      cards.push({ key: 'dom-' + dom.id, domain: dom.id, priority: band <= 3 ? 'high' : band <= 5 ? 'medium' : 'low', evidence: 'reported', reason: `${dom.name} appears to be a ${band <= 3 ? 'priority' : 'possible focus'} based on your ${RANGES[anchor!.type].label} report (band ${band} of 7). Complete a short check to see which skill to focus on.`, evidenceRef: `Reported band ${band}/7 · ${anchor!.testDate}`, nextAction: 'Take a focused check', reassess: 'After the focused check', score: 0.001 * (8 - band) })
    } else {
      const sectionGap = anchor && ((dom.section === 'M' && anchor.math != null) || (dom.section === 'RW' && anchor.rw != null))
      cards.push({ key: 'dom-' + dom.id, domain: dom.id, priority: 'medium', evidence: 'provisional', reason: sectionGap ? `Your report has a ${dom.section === 'M' ? 'Math' : 'Reading and Writing'} section score but no ${dom.name} band — needs checking. Missing evidence is not zero performance.` : `No evidence yet for ${dom.name}${unknownChildren.length ? ` (${unknownChildren.join(', ')} unknown)` : ''}. Needs checking — this is not a low score.`, evidenceRef: childObserved.length ? `${childObserved.length} child skill observed` : 'No evidence', nextAction: 'Take a focused check', reassess: 'After the focused check', score: 0.0005 })
    }
  }
  const order = { observed: 0, reported: 1, provisional: 2, secured: 3 }
  cards.sort((a, b) => (order[a.evidence] - order[b.evidence]) || (b.score - a.score))
  return { id: uid(), createdAt: now(), trigger, policyVersion: POLICY.version, anchorReportId: anchor?.id ?? null, cards }
}
export function rerank(d: DB, u: UserData, trigger: string) { const p = computePlan(d, u, trigger); u.plans.unshift(p); u.plans = u.plans.slice(0, 30); return p }
export const currentPlan = (u: UserData) => u.plans[0]
export function planDiff(before: Plan | undefined, after: Plan): string[] {
  if (!before) return ['First plan created.']
  const out: string[] = []
  const pos = (p: Plan) => Object.fromEntries(p.cards.map((c, i) => [c.key, i + 1]))
  const b = pos(before), a = pos(after)
  const name = (k: string) => k.startsWith('dom-') ? domainById(k.slice(4)).name : skillById(k).name
  for (const k of Object.keys(a)) {
    if (!(k in b)) out.push(`${name(k)} added at priority ${a[k]}.`)
    else if (b[k] !== a[k]) out.push(`${name(k)} moved from priority ${b[k]} to ${a[k]}.`)
  }
  return out.slice(0, 6)
}

// ---------------- session builder [F05] ----------------
const seenIds = (u: UserData) => new Set(u.attempts.map(a => a.qid))
function pick(pool: Question[], n: number, seen: Set<string>, used: Set<string>) {
  const fresh = pool.filter(q => !seen.has(q.id) && !used.has(q.id))
  const out = fresh.sort(() => Math.random() - 0.5).slice(0, n)
  out.forEach(q => used.add(q.id)); return out
}
export function freeCapReached(u: UserData) {
  if (u.sub.tier !== 'free' && u.sub.state !== 'past_due') return false
  const today = todayKey()
  return u.sessions.filter(s => (s.mode === 'weakness' || s.mode === 'topic') && todayKey(s.startedAt) === today).length >= POLICY.freeDailyWorkouts
}
export const effectiveTier = (u: UserData) => (u.sub.state === 'active' || u.sub.state === 'past_due') ? u.sub.tier : 'free'

export function buildSession(d: DB, u: UserData, mode: Mode, opts: { topic?: string; budgetSec?: number } = {}): Session | string {
  const bank = servable(d), seen = seenIds(u), used = new Set<string>(), notes: string[] = []
  let items: { q: Question; bucket: any }[] = []
  if (mode === 'diagnostic_starter') {
    for (const dom of DOMAINS) {
      const pool = bank.filter(q => q.domain === dom.id)
      // balance difficulty: one of each level where possible
      const chosen: Question[] = []
      for (const lvl of [1, 2, 3]) { const c = pool.find(q => q.difficulty === lvl && !chosen.includes(q) && !seen.has(q.id)); if (c) chosen.push(c) }
      for (const q of pool) if (chosen.length < POLICY.starterPerDomain && !chosen.includes(q) && !seen.has(q.id)) chosen.push(q)
      chosen.slice(0, POLICY.starterPerDomain).forEach(q => { used.add(q.id); items.push({ q, bucket: 'diagnostic' }) })
    }
    // section blocks: RW first then Math
    items.sort((a, b) => a.q.section.localeCompare(b.q.section) * -1)
  } else if (mode === 'diagnostic_focused') {
    const pool = bank.filter(q => q.domain === opts.topic)
    items = pick(pool, POLICY.focusedMax, seen, used).map(q => ({ q, bucket: 'diagnostic' }))
    if (items.length < POLICY.focusedMin) notes.push(`Only ${items.length} unseen items available in this domain; evidence will remain limited.`)
  } else if (mode === 'topic') {
    const sk = SKILLS.find(s => s.id === opts.topic)
    const pool = bank.filter(q => sk ? q.skill === sk.id : q.domain === opts.topic)
    items = pick(pool, 12, seen, used).map(q => ({ q, bucket: 'topic' }))
    if (!items.length) {
      const repeats = pool.slice(0, 6); repeats.forEach(q => items.push({ q, bucket: 'review' }))
      notes.push('You have seen every item for this topic. These are labeled review repeats and will not count as new mastery evidence.')
    }
  } else if (mode === 'review') {
    const due = u.notebook.filter(m => m.state === 'open' && m.reviewDue <= now())
    const skills = [...new Set(due.map(m => m.skill))]
    for (const s of skills) { const t = pick(bank.filter(q => q.skill === s), 2, seen, used); t.forEach(q => items.push({ q, bucket: 'review' })) }
    if (!items.length && due.length) { due.slice(0, 5).forEach(m => items.push({ q: qById(m.qid), bucket: 'review' })); notes.push('No unseen transfer items remain, so original items are repeated as review only.') }
  } else if (mode === 'delayed_check') {
    const pool = bank.filter(q => q.skill === opts.topic && q.difficulty >= 2)
    items = pick(pool, POLICY.delayedCheck.items, seen, used).map(q => ({ q, bucket: 'review' }))
    if (items.length < POLICY.delayedCheck.items) notes.push(`Only ${items.length} new medium+ items exist for this skill — progress observed; additional evidence needed. Thresholds are not relaxed.`)
  } else {
    // mixed weakness workout: 60 / 25 / 15
    const plan = currentPlan(u)
    const target = 12
    const cards = plan?.cards.filter(c => c.evidence !== 'secured') ?? []
    const poolFor = (c?: { skill?: string; domain: string }) => c ? bank.filter(q => c.skill ? q.skill === c.skill : q.domain === c.domain) : []
    const want = { primary: Math.round(target * POLICY.buckets.primary), next: Math.round(target * POLICY.buckets.next), review: 0 }
    want.review = target - want.primary - want.next
    const dueSkills = [...new Set(u.notebook.filter(m => m.state === 'open' && m.reviewDue <= now()).map(m => m.skill))]
    const rev = dueSkills.flatMap(s => pick(bank.filter(q => q.skill === s), 1, seen, used)).slice(0, want.review)
    const prim = pick(poolFor(cards[0]).concat(cards[0]?.skill ? [] : []), want.primary, seen, used)
    let nextQ = pick(poolFor(cards[1]), want.next, seen, used)
    let deficit = (want.primary - prim.length) + (want.review - rev.length)
    if (deficit > 0) { const extra = pick(cards.slice(1, 4).flatMap(c => poolFor(c)), deficit, seen, used); nextQ = nextQ.concat(extra); notes.push(`Some buckets had too few unseen items (primary ${prim.length}/${want.primary}, review ${rev.length}/${want.review}); time was redistributed to next priorities.`) }
    if (prim.length + nextQ.length + rev.length < 4) { const extra = pick(bank, 8, seen, used); nextQ = nextQ.concat(extra); notes.push('Few targeted items left — added mixed unseen practice.') }
    items = [...prim.map(q => ({ q, bucket: 'primary' })), ...nextQ.map(q => ({ q, bucket: 'next' })), ...rev.map(q => ({ q, bucket: 'review' }))]
  }
  if (!items.length) return 'No suitable items are available right now. Try another skill from the topic picker.'
  const ladder: Record<string, number> = {}
  for (const it of items) if (!(it.q.skill in ladder)) {
    const ev = skillEvidence(d, u, it.q.skill); ladder[it.q.skill] = ev.n >= 3 && ev.correct / ev.n >= 0.7 ? 2 : 1
  }
  const budget = opts.budgetSec ?? POLICY.budgetSec
  const t = now()
  return { id: uid(), mode, topicRef: opts.topic, budgetSec: budget, startedAt: t, endsAt: t + budget * 1000, pauseUsed: false, state: 'active', items: items.map((it, i) => ({ qid: it.q.id, version: it.q.version, position: i, state: 'queued', bucket: it.bucket })), ladder, ladderLog: [], notes, policyVersion: POLICY.version, explanationMs: 0, planBefore: u.plans[0]?.id }
}

/** Difficulty ladder: choose next queued item nearest to the current level for the next skill in queue (materialized set only). */
export function nextItemIndex(s: Session): number {
  const queued = s.items.filter(i => i.state === 'queued' || i.state === 'presented')
  const presented = s.items.find(i => i.state === 'presented'); if (presented) return presented.position
  if (!queued.length) return -1
  if (s.mode.startsWith('diagnostic')) return queued[0].position
  const skill = qById(queued[0].qid).skill
  const lvl = s.ladder[skill] ?? 1
  const sameSkill = queued.filter(i => qById(i.qid).skill === skill)
  sameSkill.sort((a, b) => Math.abs(qById(a.qid).difficulty - lvl) - Math.abs(qById(b.qid).difficulty - lvl))
  return sameSkill[0].position
}

export function grade(q: Question, response: string) { return q.type === 'numeric' ? gradeNumeric(response, q.answer as string[]) : Number(response) === q.answer }

export function submitAnswer(d: DB, u: UserData, s: Session, pos: number, response: string, assistance: number, idemKey: string): { ok: boolean; late?: boolean; attempt?: Attempt } {
  const dup = u.attempts.find(a => a.idempotencyKey === idemKey); if (dup) return { ok: true, attempt: dup } // idempotent
  const item = s.items[pos]
  if (item.state === 'answered') return { ok: true, attempt: u.attempts.find(a => a.sessionId === s.id && a.qid === item.qid) }
  if (now() > s.endsAt + POLICY.graceSec * 1000) { item.state = 'unattempted'; return { ok: false, late: true } }
  const q = qById(item.qid)
  const firstExposure = !u.attempts.some(a => a.qid === q.id) && item.bucket !== 'review'
  const correct = grade(q, response)
  const a: Attempt = { id: uid(), sessionId: s.id, mode: s.mode, qid: q.id, version: q.version, skill: q.skill, domain: q.domain, difficulty: q.difficulty, response, correct, firstExposure, assistance, answerMs: now() - (item.presentedAt ?? now()), explanationMs: 0, idempotencyKey: idemKey, answeredAt: now() }
  u.attempts.push(a); item.state = 'answered'
  // ladder (practice modes only)
  if (!s.mode.startsWith('diagnostic')) {
    const recent = u.attempts.filter(x => x.sessionId === s.id && x.skill === q.skill).slice(-2)
    const lvl = s.ladder[q.skill] ?? 1
    let to = lvl, reason = ''
    if (assistance > 0) { reason = 'assistance used — streak reset' }
    else if (recent.length === 2 && recent.every(x => x.correct && x.assistance === 0)) { to = Math.min(3, lvl + 1); reason = '2 independent correct' }
    else if (recent.length === 2 && recent.every(x => !x.correct)) { to = Math.max(1, lvl - 1); reason = '2 incorrect' }
    if (to !== lvl || reason) { s.ladderLog.push({ at: now(), skill: q.skill, from: lvl, to, reason }); s.ladder[q.skill] = to }
  }
  // mistake notebook: incorrect PRACTICE attempts only, deduped on attempt id [F06]
  if (!correct && !s.mode.startsWith('diagnostic') && s.mode !== 'delayed_check' && !u.notebook.some(m => m.attemptId === a.id)) {
    const [lo, hi] = POLICY.reviewDays
    const days = lo + Math.floor(Math.random() * (hi - lo + 1))
    u.notebook.unshift({ id: uid(), attemptId: a.id, qid: q.id, skill: q.skill, response, createdAt: now(), category: null, note: '', state: 'open', reviewDue: now() + days * DAY })
  }
  // review success on a repeat of the original item
  if (s.mode === 'review') {
    const m = u.notebook.find(m => m.state === 'open' && (m.qid === q.id || m.skill === q.skill) && m.reviewDue <= now())
    if (m) { m.reviewResult = correct ? 'success' : 'miss'; if (correct) { m.state = 'reviewed'; m.reviewDone = now() } }
  }
  return { ok: true, attempt: a }
}

export function completeSession(d: DB, u: UserData, s: Session) {
  if (s.state === 'completed') return
  s.items.forEach(i => { if (i.state !== 'answered') i.state = 'unattempted' })
  s.state = 'completed'; s.completedAt = now(); s.blockFeedbackReleased = true
  if (s.mode === 'delayed_check' && s.topicRef) {
    const atts = u.attempts.filter(a => a.sessionId === s.id)
    const dc = u.delayedChecks.find(c => c.skill === s.topicRef && c.state === 'scheduled')
    const result = { correct: atts.filter(a => a.correct).length, total: atts.length }
    if (dc) { dc.state = 'done'; dc.result = result } else u.delayedChecks.push({ id: uid(), skill: s.topicRef, dueAt: now(), state: 'done', result })
  }
  // schedule delayed checks for newly improving skills
  for (const sk of new Set(u.attempts.filter(a => a.sessionId === s.id).map(a => a.skill))) {
    const ev = skillEvidence(d, u, sk)
    if (ev.status === 'improving' && !u.delayedChecks.some(c => c.skill === sk && c.state === 'scheduled'))
      u.delayedChecks.push({ id: uid(), skill: sk, dueAt: now() + POLICY.delayedCheck.minDays * DAY, state: 'scheduled' })
  }
  const p = rerank(d, u, `Session completed (${modeLabel(s.mode)})`)
  s.planAfter = p.id
  awardBadges(d, u)
  track(d, 'session_completed:' + s.mode)
}

export const modeLabel = (m: Mode) => ({ diagnostic_starter: 'Starter diagnostic', diagnostic_focused: 'Focused check', weakness: 'Today\'s workout', topic: 'Topic workout', review: 'Scheduled review', delayed_check: 'Delayed check' }[m])

// ---------------- habits, XP, badges [F08] (private, effort-based — no leaderboards) ----------------
export function xpOf(u: UserData) {
  const answered = u.attempts.length
  const workouts = u.sessions.filter(s => s.state === 'completed').length
  const reviews = u.notebook.filter(m => m.state === 'reviewed').length
  const classified = u.notebook.filter(m => m.category).length
  return answered * 10 + workouts * 50 + reviews * 30 + classified * 5 + u.reports.length * 20
}
export const levelOf = (xp: number) => ({ level: Math.floor(xp / 300) + 1, into: xp % 300, need: 300 })
export function weekStart(t = now()) { const dt = new Date(t); const day = (dt.getDay() + 6) % 7; dt.setHours(0, 0, 0, 0); return dt.getTime() - day * DAY }
export function workoutsThisWeek(u: UserData) { const ws = weekStart(); return u.sessions.filter(s => s.state === 'completed' && (s.completedAt ?? 0) >= ws).length }
/** Practice-day streak — shown privately; a missed day is framed kindly, never as failure. */
export function dayStreak(u: UserData) {
  const days = new Set(u.attempts.map(a => todayKey(a.answeredAt)))
  let n = 0; let t = now()
  if (!days.has(todayKey(t))) t -= DAY
  while (days.has(todayKey(t))) { n++; t -= DAY }
  return n
}
export function weeksGoalMet(u: UserData) {
  let n = 0; let ws = weekStart() - 7 * DAY
  for (let i = 0; i < 52; i++) { const c = u.sessions.filter(s => s.state === 'completed' && (s.completedAt ?? 0) >= ws && (s.completedAt ?? 0) < ws + 7 * DAY).length; if (c >= u.goals.weeklyWorkouts) { n++; ws -= 7 * DAY } else break }
  return n + (workoutsThisWeek(u) >= u.goals.weeklyWorkouts ? 1 : 0)
}
export const BADGES: { id: string; name: string; desc: string; test: (u: UserData) => boolean }[] = [
  { id: 'first-step', name: 'First step', desc: 'Answered your first question', test: u => u.attempts.length >= 1 },
  { id: 'baseline', name: 'Baseline set', desc: 'Completed the starter diagnostic', test: u => u.sessions.some(s => s.mode === 'diagnostic_starter' && s.state === 'completed') },
  { id: 'reporter', name: 'Data driven', desc: 'Entered a score report', test: u => u.reports.length >= 1 },
  { id: 'reflect', name: 'Reflective learner', desc: 'Classified 3 mistakes', test: u => u.notebook.filter(m => m.category).length >= 3 },
  { id: 'comeback', name: 'Closed the loop', desc: 'Successfully reviewed a past mistake', test: u => u.notebook.some(m => m.reviewResult === 'success') },
  { id: 'weekly', name: 'Weekly goal', desc: 'Hit your weekly workout goal', test: u => workoutsThisWeek(u) >= u.goals.weeklyWorkouts },
  { id: 'fifty', name: 'Fifty questions', desc: 'Answered 50 questions', test: u => u.attempts.length >= 50 },
  { id: 'improving', name: 'On the rise', desc: 'A skill reached "improving"', test: u => u.plans[0]?.cards.some(c => c.reason.startsWith('Improving')) ?? false },
]
export function awardBadges(_d: DB, u: UserData) { for (const b of BADGES) if (b.test(u) && !u.badges.some(x => x.id === b.id)) u.badges.push({ id: b.id, at: now() }) }

// ---------------- billing (mock Stripe + webhooks) [F09] ----------------
/** Browser redirect never grants access — only processed webhook events do. Duplicates are ignored by event id. */
export function deliverWebhook(d: DB, ev: { id: string; type: string; userId: string; payload: any }) {
  const existing = d.webhooks.find(w => w.id === ev.id)
  if (existing) { existing.duplicateDeliveries++; return 'duplicate' }
  d.webhooks.unshift({ ...ev, receivedAt: now(), duplicateDeliveries: 0 })
  const u = d.data[ev.userId]; if (!u) return 'unknown-user'
  const t = now(), s = u.sub
  switch (ev.type) {
    case 'customer.subscription.created': {
      const tier = ev.payload.tier as 'plus' | 'max'
      const upgrade = s.state === 'active' && s.tier === 'plus' && tier === 'max'
      u.sub = { ...s, tier, state: 'active', termStart: upgrade ? s.termStart : t, termEnd: t + POLICY.terms[tier] * 30 * DAY, periodEnd: t + 30 * DAY, cancelAtPeriodEnd: false, graceUntil: undefined, firstPurchaseAt: s.firstPurchaseAt ?? t }
      u.invoices.unshift({ id: 'in_' + uid().slice(0, 8), at: t, amount: upgrade ? POLICY.prices.max - POLICY.prices.plus : POLICY.prices[tier], desc: upgrade ? 'Upgrade Plus → Max (prorated)' : `${tier === 'plus' ? 'Plus' : 'Max'} — monthly`, status: 'paid' })
      break
    }
    case 'invoice.payment_failed': s.state = 'past_due'; s.graceUntil = t + POLICY.graceDays * DAY; u.invoices.unshift({ id: 'in_' + uid().slice(0, 8), at: t, amount: POLICY.prices[s.tier as 'plus' | 'max'] ?? 0, desc: 'Renewal — payment failed', status: 'failed' }); break
    case 'invoice.payment_succeeded': s.state = 'active'; s.graceUntil = undefined; s.periodEnd = t + 30 * DAY; u.invoices.unshift({ id: 'in_' + uid().slice(0, 8), at: t, amount: POLICY.prices[s.tier as 'plus' | 'max'] ?? 0, desc: 'Renewal', status: 'paid' }); break
    case 'customer.subscription.paused': s.state = 'paused'; break
    case 'customer.subscription.resumed': s.state = 'active'; break
    case 'customer.subscription.updated': s.cancelAtPeriodEnd = ev.payload.cancelAtPeriodEnd; break
    case 'customer.subscription.deleted': u.sub = { tier: 'free', state: 'canceled', refunds: s.refunds, firstPurchaseAt: s.firstPurchaseAt }; break
    case 'charge.refunded': { const inv = u.invoices.find(i => i.status === 'paid'); if (inv) inv.status = 'refunded'; u.sub = { tier: 'free', state: 'canceled', refunds: s.refunds + 1, firstPurchaseAt: s.firstPurchaseAt }; break }
  }
  d.webhooks[0].processedAt = now()
  audit(d, 'stripe-webhook', ev.type, ev.userId)
  return 'processed'
}
/** Lifecycle sweep, like a scheduled worker: grace expiry → Free; cancel at period end → Free. Data is never deleted. */
export function billingSweep(d: DB) {
  for (const [id, u] of Object.entries(d.data)) {
    const s = u.sub
    if (s.state === 'past_due' && s.graceUntil && now() > s.graceUntil) { u.sub = { tier: 'free', state: 'canceled', refunds: s.refunds, firstPurchaseAt: s.firstPurchaseAt }; u.notices.unshift({ id: uid(), at: now(), text: 'Your payment grace period ended, so your account moved to Free. All your learning data is kept — re-upgrade any time to restore paid features.' }); audit(d, 'worker', 'grace_expired_downgrade', id) }
    if (s.state === 'active' && s.cancelAtPeriodEnd && s.periodEnd && now() > s.periodEnd) { u.sub = { tier: 'free', state: 'canceled', refunds: s.refunds, firstPurchaseAt: s.firstPurchaseAt }; audit(d, 'worker', 'period_end_cancel', id) }
  }
}

// ---------------- reminders [F08] ----------------
export function maybeReminder(d: DB) {
  const u = currentUser(d); if (!u) return
  const data = d.data[u.id]; const p = data.prefs
  if (!p.reminderOptIn) return
  const today = todayKey(); if (p.lastReminderDate === today) return // max one per day
  const hm = new Date(now()).toTimeString().slice(0, 5)
  const inQuiet = p.quietStart > p.quietEnd ? (hm >= p.quietStart || hm < p.quietEnd) : (hm >= p.quietStart && hm < p.quietEnd)
  if (inQuiet || hm < p.reminderTime) return
  if (data.attempts.some(a => todayKey(a.answeredAt) === today)) return
  p.lastReminderDate = today
  data.notices.unshift({ id: uid(), at: now(), text: 'Reminder: a 20-minute workout is ready whenever you are. (Turn reminders off in Settings with one click.)' })
}
