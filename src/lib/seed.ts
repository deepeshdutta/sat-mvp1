import { DAY, defaultUserData, update, uid, getDB, now } from './store'
import { buildSession, completeSession, nextItemIndex, qById, rerank, submitAnswer } from './engine'
import type { Mode } from './store'

// Weakness profile of the sample learner (probability of a correct answer per skill)
const P: Record<string, number> = { boundaries: 0.3, 'form-structure': 0.55, transitions: 0.5, 'linear-functions': 0.55, 'nonlinear-eq': 0.35, 'equiv-expr': 0.6, 'words-context': 0.85, 'central-ideas': 0.9, percentages: 0.7 }

/** Creates a signed-in sample learner with ~2 weeks of realistic history (for demos/screenshots). */
export function seedDemo() {
  const email = 'demo.student@example.com'
  let userId = getDB().users.find(u => u.email === email)?.id
  update(d => {
    if (userId) { d.data[userId] = defaultUserData() } else { userId = uid(); d.users.push({ id: userId, email, createdAt: Date.now() - 16 * DAY, eligibility: { status: 'eligible', policyVersion: 'age-gate-v1' }, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); d.data[userId] = defaultUserData() }
    const u = d.data[userId!]
    u.onboarded = true
    u.goals = { ...u.goals, targetTotal: 1350, targetRW: null, targetMath: 700, testDate: new Date(Date.now() + 60 * DAY).toISOString().slice(0, 10), weeklyWorkouts: 4, availability: ['Mon', 'Tue', 'Thu', 'Sat'], sectionPreference: 'balanced' }
    u.reports.push({ id: uid(), type: 'psat_10', sourceLabel: '', testDate: new Date(Date.now() - 120 * DAY).toISOString().slice(0, 10), enteredAt: Date.now() - 16 * DAY, total: 1140, rw: 590, math: 550, bands: { ii: 5, cs: 5, eoi: 4, sec: 3, alg: 4, adv: 3, psda: 4, geo: null }, feedback: 'Focus on Standard English Conventions and Advanced Math.', confirmed: true, revisions: [] })
    const token = uid() + uid()
    d.authSessions.push({ id: uid(), userId: userId!, tokenHash: token, createdAt: Date.now(), expiresAt: Date.now() + 30 * DAY, device: 'Desktop browser', recentAuthAt: Date.now() })
    d.token = token
    rerank(d, u, 'Onboarding goals set')
  })
  const run = (daysAgo: number, mode: Mode, topic?: string, limit = 99) => {
    update(d => { d.clockOffsetMs = -daysAgo * DAY })
    update(d => {
      const u = d.data[userId!]
      const s = buildSession(d, u, mode, { topic }); if (typeof s === 'string') return
      u.sessions.push(s)
      const ss = u.sessions[u.sessions.length - 1]
      let n = 0
      while (n < limit) {
        const pos = nextItemIndex(ss); if (pos < 0) break
        ss.items[pos].state = 'presented'; ss.items[pos].presentedAt = now() - 40_000 - Math.random() * 60_000
        const q = qById(ss.items[pos].qid)
        const ok = Math.random() < (P[q.skill] ?? 0.75) - (q.difficulty - 2) * 0.1
        const resp = q.type === 'numeric' ? (ok ? (q.answer as string[])[0] : '0') : String(ok ? q.answer : ((q.answer as number) + 1) % 4)
        const r = submitAnswer(d, u, ss, pos, resp, Math.random() < 0.12 ? 1 : 0, `${ss.id}:${pos}`)
        if (r.attempt) r.attempt.explanationMs = mode.startsWith('diagnostic') ? 0 : 20_000 + Math.random() * 40_000
        n++
      }
      completeSession(d, u, ss)
      ss.blockBreakSeen = true
      if (u.notebook[0]) { u.notebook[0].category = 'concept' }
    })
  }
  run(15, 'diagnostic_starter')
  run(13, 'diagnostic_focused', 'sec', 8)
  run(11, 'topic', 'boundaries')
  run(8, 'weakness', undefined, 8)
  run(6, 'topic', 'nonlinear-eq')
  run(2, 'weakness', undefined, 7)
  run(1, 'topic', 'transitions')
  update(d => { d.clockOffsetMs = 0; const u = d.data[userId!]; u.notebook.slice(2, 4).forEach(m => m.category = 'misread'); u.prefs.reminderOptIn = true })
}
