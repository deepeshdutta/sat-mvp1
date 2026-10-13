import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Pause, Play, Flag, Lightbulb, X, CheckCircle2, XCircle, ChevronRight, BookOpen, WifiOff, Sparkles, Lock } from 'lucide-react'
import { Card, Chip, Modal, cx, useToast, usePaywall } from '../components/ui'
import { update, useMe, myData, getDB, now, uid, audit } from '../lib/store'
import { completeSession, modeLabel, nextItemIndex, qById, servable, submitAnswer, effectiveTier } from '../lib/engine'
import { POLICY } from '../lib/policy'
import { skillById, domainById } from '../data/taxonomy'

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const L = ['A', 'B', 'C', 'D']

export default function SessionPage() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast(); const paywall = usePaywall()
  const { data } = useMe()
  const s = data?.sessions.find(x => x.id === id) // only the signed-in user's sessions are reachable
  const [, tick] = useState(0)
  const [sel, setSel] = useState<string>('')
  const [hintLvl, setHintLvl] = useState(0)
  const [feedback, setFeedback] = useState<null | { attemptId: string; correct: boolean; pos: number }>(null)
  const [helpStep, setHelpStep] = useState(0)
  const [report, setReport] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const fbAt = useRef(0)
  useEffect(() => { const i = setInterval(() => tick(t => t + 1), 500); const on = () => setOnline(true), off = () => setOnline(false); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { clearInterval(i); window.removeEventListener('online', on); window.removeEventListener('offline', off) } }, [])
  const isDiag = s?.mode.startsWith('diagnostic')
  const pos = s && s.state !== 'completed' ? nextItemIndex(s) : -1
  // mark item presented (server timestamp) — deterministic resume on refresh
  useEffect(() => { if (s && pos >= 0 && s.items[pos].state === 'queued' && !feedback) update(d => { const ss = myData(d)!.sessions.find(x => x.id === s.id)!; ss.items[pos].state = 'presented'; ss.items[pos].presentedAt = now() }) }, [s?.id, pos, feedback])
  // timer & pause enforcement
  const remaining = s ? (s.state === 'paused' && s.pausedAt ? s.endsAt - s.pausedAt : s.endsAt - now()) : 0
  const pauseLeft = s?.state === 'paused' && s.pausedAt ? POLICY.pauseMaxSec * 1000 - (now() - s.pausedAt) : 0
  useEffect(() => {
    if (!s || s.state === 'completed') return
    if (s.state === 'paused' && pauseLeft <= 0) resume()
    else if (s.state === 'active' && remaining <= -POLICY.graceSec * 1000 && !feedback) finish('Time is up. Unanswered items are marked unattempted — not wrong.')
  })
  if (!data) return null
  if (!s) return <Navigate to="/app" replace />
  if (s.state === 'completed') return <Navigate to={'/app/report/' + s.id} replace />
  function finish(msg?: string) { update(d => { const u = myData(d)!; completeSession(d, u, u.sessions.find(x => x.id === s!.id)!) }); if (msg) toast(msg); nav('/app/report/' + s!.id) }
  function pause() { if (s!.pauseUsed) return toast('You can pause once per session.'); update(d => { const ss = myData(d)!.sessions.find(x => x.id === s!.id)!; ss.state = 'paused'; ss.pausedAt = now(); ss.pauseUsed = true }) }
  function resume() { update(d => { const ss = myData(d)!.sessions.find(x => x.id === s!.id)!; if (ss.state !== 'paused') return; const ext = Math.min(now() - (ss.pausedAt ?? now()), POLICY.pauseMaxSec * 1000); ss.endsAt += ext; ss.state = 'active'; ss.pausedAt = undefined }) }

  const answered = s.items.filter(i => i.state === 'answered').length
  // block break between R&W and Math in the starter diagnostic (feedback released after the block)
  const rwItems = s.items.filter(i => qById(i.qid).section === 'RW')
  const needBreak = s.mode === 'diagnostic_starter' && !s.blockBreakSeen && rwItems.length > 0 && rwItems.every(i => i.state === 'answered') && s.items.some(i => i.state !== 'answered' && qById(i.qid).section === 'M')
  if (needBreak) {
    const atts = data.attempts.filter(a => a.sessionId === s.id && a.domain && qById(a.qid).section === 'RW')
    return <div className="mx-auto max-w-2xl"><Card className="p-6"><Chip tone="teal">Block 1 of 2 complete</Chip><h1 className="mt-3 text-2xl font-extrabold">Reading & Writing block done</h1><p className="mt-1 text-ink-600">Feedback for this block is now released. Take a breather — your progress is saved. You can leave and resume the Math block later.</p>
      <ul className="mt-4 divide-y divide-ink-100">{atts.map(a => <li key={a.id} className="flex items-center gap-3 py-2 text-sm">{a.correct ? <CheckCircle2 className="text-teal-600" size={18} /> : <XCircle className="text-rose-500" size={18} />}<span className="flex-1">{skillById(a.skill).name}</span><span className="text-xs text-ink-500">{domainById(a.domain).name}</span></li>)}</ul>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row"><button className="btn-primary flex-1" onClick={() => update(d => { myData(d)!.sessions.find(x => x.id === s.id)!.blockBreakSeen = true })}>Continue to Math block</button><button className="btn-secondary" onClick={() => { update(d => { myData(d)!.sessions.find(x => x.id === s.id)!.blockBreakSeen = true }); nav('/app') }}>Save & exit</button></div></Card></div>
  }
  if (pos < 0 && !feedback) { setTimeout(() => finish(), 0); return null }
  const curPos = feedback ? feedback.pos : pos
  const item = s.items[curPos]; const q = qById(item.qid)
  const attempt = feedback ? data.attempts.find(a => a.id === feedback.attemptId) : undefined
  const isRepeat = item.bucket === 'review' && data.attempts.some(a => a.qid === q.id && a.sessionId !== s.id)

  const submit = () => {
    if (!sel) return
    let res: any
    update(d => { const u = myData(d)!; res = submitAnswer(d, u, u.sessions.find(x => x.id === s.id)!, curPos, sel, hintLvl, `${s.id}:${curPos}`) })
    if (res.late) { toast('Time was up — that item is unattempted, not wrong.'); return finish() }
    if (isDiag) { setSel(''); setHintLvl(0); return }
    fbAt.current = Date.now(); setFeedback({ attemptId: res.attempt.id, correct: res.attempt.correct, pos: curPos }); setHelpStep(0)
  }
  const next = () => {
    const ms = Date.now() - fbAt.current
    update(d => { const u = myData(d)!; const a = u.attempts.find(x => x.id === feedback!.attemptId); if (a) a.explanationMs += ms; u.sessions.find(x => x.id === s.id)!.explanationMs += ms })
    setFeedback(null); setSel(''); setHintLvl(0); setHelpStep(0)
  }
  const transfer = () => {
    const t = servable(getDB()).find(x => x.skill === q.skill && x.id !== q.id && !data.attempts.some(a => a.qid === x.id) && !s.items.some(i => i.qid === x.id))
    if (!t) return toast('No unseen transfer question left for this skill — try another skill from the topic picker.')
    update(d => { const ss = myData(d)!.sessions.find(x => x.id === s.id)!; ss.items.splice(curPos + 1, 0, { qid: t.id, version: t.version, position: 0, state: 'queued', bucket: 'topic' }); ss.items.forEach((it, i) => it.position = i) })
    toast('A fresh transfer question is next.'); next()
  }
  const wrongIdx = attempt && q.type === 'mcq' && !attempt.correct ? Number(attempt.response) : -1
  const helpSteps = [
    { k: 'Small hint', v: q.hints[0] }, { k: 'The rule', v: q.hints[1] },
    ...(wrongIdx >= 0 && q.distractors?.[wrongIdx] ? [{ k: `Why ${L[wrongIdx]} is wrong`, v: q.distractors[wrongIdx] }] : []),
    { k: 'Worked solution', v: q.explanation }, { k: 'Common trap', v: q.trap },
  ]
  const low = remaining < 120_000
  return <div className="mx-auto max-w-3xl">
    {/* header */}
    <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-ink-200 bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white lg:top-16">
      <div className="flex items-center gap-3">
        <button className="btn-ghost p-2" aria-label="Finish session" onClick={() => confirm('Finish now? Saved answers are kept; unanswered items count as unattempted, not wrong.') && finish()}><X size={18} /></button>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{modeLabel(s.mode)}{s.topicRef && ` · ${s.mode === 'diagnostic_focused' ? domainById(s.topicRef).name : skillById(s.topicRef)?.name ?? ''}`}</div><div className="mt-1 h-1.5 rounded-full bg-ink-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(answered / s.items.length) * 100}%` }} /></div></div>
        <div className={cx('rounded-lg px-2.5 py-1 font-mono text-sm font-bold tabular-nums', low ? 'bg-rose-50 text-rose-700' : 'bg-ink-100 text-ink-800')} aria-label="Time remaining">{mmss(remaining)}</div>
        <button className="btn-ghost p-2" disabled={s.pauseUsed} onClick={pause} aria-label="Pause" title={s.pauseUsed ? 'Pause already used' : 'Pause once (up to 5 min)'}><Pause size={18} /></button>
      </div>
    </div>
    {!online && <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><WifiOff size={16} />You're offline. Answers already submitted are saved; only saved progress is guaranteed.</div>}
    {s.notes.length > 0 && answered === 0 && !feedback && <div className="mb-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{s.notes.join(' ')}</div>}
    <Card className="p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold text-ink-500">Question {answered + (feedback ? 0 : 1)} of {s.items.length}</span>{!isDiag && <Chip tone="indigo">{skillById(q.skill).name}</Chip>}<Chip tone="gray">{['', 'Easy', 'Medium', 'Hard'][q.difficulty]}</Chip>{isRepeat && <Chip tone="amber">Review repeat · not new evidence</Chip>}{item.bucket && !isDiag && item.bucket !== 'topic' && <Chip tone="gray">{item.bucket}</Chip>}</div>
      {q.passage && <div className="mb-4 rounded-xl border-l-4 border-indigo-200 bg-ink-50 p-4 text-[15px] leading-relaxed text-ink-800">{q.passage}</div>}
      <h2 className="font-sans text-base font-semibold leading-relaxed text-ink-900 sm:text-lg">{q.stem}</h2>
      {q.type === 'mcq' ? <div className="mt-4 space-y-2" role="radiogroup">{q.choices!.map((c, i) => {
        const chosen = sel === String(i) || (feedback && attempt?.response === String(i))
        const isAns = feedback && q.answer === i
        return <button key={i} disabled={!!feedback} role="radio" aria-checked={!!chosen} onClick={() => setSel(String(i))} className={cx('flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left text-[15px] transition', isAns ? 'border-teal-500 bg-teal-50' : feedback && chosen ? 'border-rose-400 bg-rose-50' : chosen ? 'border-indigo-600 bg-indigo-50' : 'border-ink-200 hover:border-ink-300')}>
          <span className={cx('grid h-7 w-7 flex-none place-items-center rounded-full text-sm font-bold', isAns ? 'bg-teal-500 text-white' : chosen ? 'bg-indigo-600 text-white' : 'bg-ink-100 text-ink-600')}>{L[i]}</span><span className="pt-0.5">{c}</span></button> })}</div>
        : <div className="mt-4"><label className="label" htmlFor="num">Your answer</label><input id="num" disabled={!!feedback} className="input max-w-xs font-mono text-lg" inputMode="decimal" placeholder="e.g. 4.5 or 9/2" value={feedback ? attempt?.response : sel} onChange={e => setSel(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} /><p className="mt-1 text-xs text-ink-500">Fractions, decimals and .5-style answers are accepted.</p>{feedback && <p className="mt-2 text-sm">Accepted: <b>{(q.answer as string[]).join(' or ')}</b></p>}</div>}
      {!feedback && !isDiag && hintLvl > 0 && <div className="mt-4 space-y-2">{q.hints.slice(0, hintLvl).map((h, i) => <div key={i} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>{i === 0 ? 'Hint' : 'Rule'}:</b> {h}</div>)}<p className="text-xs text-ink-500">Hints mark this answer as assisted — it counts separately from independent accuracy.</p></div>}
      {!feedback && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2">{!isDiag ? <button className="btn-ghost" disabled={hintLvl >= 2} onClick={() => setHintLvl(h => h + 1)}><Lightbulb size={16} />{hintLvl === 0 ? 'Hint' : 'Show rule'}</button> : <span className="text-xs text-ink-500">Hints unlock after the diagnostic block.</span>}
          <button className="btn-ghost" onClick={() => setReport(true)}><Flag size={16} />Report</button></div>
        <button className="btn-primary sm:ml-auto sm:px-8" disabled={!sel} onClick={submit}>{isDiag ? 'Save & next' : 'Check answer'}</button></div>}
      {feedback && <div className="mt-6">
        <div className={cx('flex items-center gap-2 rounded-xl p-3 font-semibold', feedback.correct ? 'bg-teal-50 text-teal-800' : 'bg-rose-50 text-rose-800')}>{feedback.correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}{feedback.correct ? 'Correct' : 'Not quite'} <span className="font-normal">· {skillById(q.skill).name}{attempt && attempt.assistance > 0 ? ' · assisted' : ''}</span></div>
        <p className="mt-3 text-sm text-ink-700"><b>Reviewed explanation:</b> {q.explanation}</p>
        {!feedback.correct && <p className="mt-2 flex items-center gap-1 text-xs text-ink-500"><BookOpen size={13} />Added to your mistake notebook with a check-back in 3–7 days.</p>}
        <div className="mt-4 rounded-xl border border-ink-200 p-3"><div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Guided help</div>
          <div className="space-y-2">{helpSteps.slice(0, helpStep).map(h => <div key={h.k} className="rounded-lg bg-indigo-50 p-2.5 text-sm text-indigo-900"><b>{h.k}:</b> {h.v}</div>)}</div>
          <div className="mt-2 flex flex-wrap gap-2">{helpStep < helpSteps.length && <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setHelpStep(h => h + 1)}>{helpSteps[helpStep].k}</button>}<button className="btn-secondary px-3 py-1.5 text-xs" onClick={transfer}>Try a fresh transfer question</button><button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => effectiveTier(data) === 'max' ? toast('AI tutor ships in MVP2 after quality gates.') : paywall('AI tutor (bounded, grounded help)', 'Max')}>{effectiveTier(data) !== 'max' && <Lock size={12} />}<Sparkles size={12} />Ask AI tutor</button></div></div>
        <div className="mt-5 flex gap-2"><button className="btn-ghost" onClick={() => setReport(true)}><Flag size={16} />Report</button><button className="btn-primary ml-auto sm:px-8" onClick={next}>Next <ChevronRight size={16} /></button></div>
      </div>}
    </Card>
    <p className="mt-3 text-center text-xs text-ink-500">20-minute learning budget including explanations — not an official exam simulation. Answer time and explanation time are logged separately.</p>
    {s.state === 'paused' && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/70 p-4"><Card className="w-full max-w-sm p-6 text-center"><Pause className="mx-auto text-indigo-600" size={32} /><h2 className="mt-2 text-xl font-bold">Paused</h2><p className="mt-1 text-sm text-ink-600">Auto-resumes in <b className="font-mono">{mmss(pauseLeft)}</b>. One pause per session.</p><button className="btn-primary mt-4 w-full" onClick={resume}><Play size={16} />Resume</button></Card></div>}
    <ReportModal open={report} onClose={() => setReport(false)} qid={q.id} />
  </div>
}

export function ReportModal({ open, onClose, qid }: { open: boolean; onClose: () => void; qid: string }) {
  const toast = useToast(); const [reason, setReason] = useState('wrong_key'); const [note, setNote] = useState('')
  const reasons: [string, string][] = [['wrong_key', 'The answer key looks wrong'], ['unclear', 'Question is unclear or ambiguous'], ['typo', 'Typo or formatting'], ['explanation', 'Explanation is confusing'], ['other', 'Other']]
  const submit = () => {
    update(d => {
      const u = currentUserId(); const critical = reason === 'wrong_key'
      d.flags.unshift({ id: uid(), qid, reporter: u, reason: reasons.find(r => r[0] === reason)![1] + (note ? ` — ${note}` : ''), severity: critical ? 'critical' : 'minor', state: critical ? 'quarantined' : 'open', at: now() })
      if (critical) { d.qStatus[qid] = 'quarantined'; audit(d, 'system', 'auto_quarantine', qid)
        // re-evaluate mastery: invalidate attempts on the quarantined item for every learner, with an explanatory note
        for (const ud of Object.values(d.data)) { let hit = false; ud.attempts.forEach(a => { if (a.qid === qid && !a.invalidatedAt) { a.invalidatedAt = now(); hit = true } }); if (hit) ud.notices.unshift({ id: uid(), at: now(), text: `A question you answered (${qid}) was withdrawn for review, so it no longer counts toward your progress. That's why your progress may have changed.` }) }
      }
    })
    toast(reason === 'wrong_key' ? 'Thanks — the item was pulled for review. Keep going!' : 'Thanks — sent to our content QA queue.'); setNote(''); onClose()
  }
  return <Modal open={open} onClose={onClose} title="Report a problem with this question"><div className="space-y-2">{reasons.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="radio" name="r" checked={reason === k} onChange={() => setReason(k)} />{l}</label>)}</div><textarea className="input mt-3" placeholder="Details (optional)" value={note} onChange={e => setNote(e.target.value)} /><p className="mt-2 text-xs text-ink-500">Your workout continues — nothing is lost.</p><div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Send report</button></div></Modal>
}
const currentUserId = () => { const d = getDB(); return d.authSessions.find(s => s.tokenHash === d.token)?.userId ?? 'anon' }
