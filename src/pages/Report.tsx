import { Link, Navigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, MinusCircle, ArrowRight, PartyPopper } from 'lucide-react'
import { Card, Chip, PageHeader, StatusChip } from '../components/ui'
import { useMe, getDB } from '../lib/store'
import { modeLabel, planDiff, qById, skillEvidence } from '../lib/engine'
import { skillById, DOMAINS } from '../data/taxonomy'

const sec = (ms: number) => ms < 60000 ? `${Math.round(ms / 1000)}s` : `${(ms / 60000).toFixed(1)} min`
export default function SessionReport() {
  const { id } = useParams(); const { data } = useMe()
  if (!data) return null
  const s = data.sessions.find(x => x.id === id); if (!s) return <Navigate to="/app" replace />
  const atts = data.attempts.filter(a => a.sessionId === s.id)
  const indep = atts.filter(a => a.assistance === 0), assisted = atts.filter(a => a.assistance > 0)
  const unatt = s.items.filter(i => i.state === 'unattempted').length
  const ansMs = atts.reduce((t, a) => t + a.answerMs, 0), expMs = atts.reduce((t, a) => t + a.explanationMs, 0)
  const skills = [...new Set(atts.map(a => a.skill))]
  const before = data.plans.find(p => p.id === s.planBefore), after = data.plans.find(p => p.id === s.planAfter)
  const changes = after ? planDiff(before, after) : []
  const isDiag = s.mode.startsWith('diagnostic')
  const next = after?.cards.find(c => c.evidence !== 'secured')
  return <>
    <PageHeader eyebrow={modeLabel(s.mode) + ' · report'} title={isDiag ? 'Your learning baseline' : 'Workout complete'} sub={isDiag ? 'This is a learning baseline from a short sample — not an official SAT score or percentile. Domains with little evidence remain "needs check".' : 'Nice work showing up. Here is exactly what this session tells us — and what it doesn\'t.'} />
    {!isDiag && <Card className="mb-4 flex items-center gap-3 bg-gradient-to-r from-teal-50 to-indigo-50 p-4"><PartyPopper className="text-indigo-600" /><div className="text-sm"><b>+{atts.length * 10 + 50} XP</b> for effort · {atts.length} questions worked through{atts.some(a => a.correct && a.difficulty === 3) ? ' · you solved a hard one!' : ''}</div></Card>}
    <div className="grid gap-3 sm:grid-cols-4">
      <Card className="p-4"><div className="text-xs font-semibold text-ink-500">Independent accuracy</div><div className="font-head text-2xl font-extrabold">{indep.filter(a => a.correct).length}/{indep.length}</div></Card>
      <Card className="p-4"><div className="text-xs font-semibold text-ink-500">Assisted (hinted)</div><div className="font-head text-2xl font-extrabold">{assisted.length ? `${assisted.filter(a => a.correct).length}/${assisted.length}` : '—'}</div></Card>
      <Card className="p-4"><div className="text-xs font-semibold text-ink-500">Unattempted</div><div className="font-head text-2xl font-extrabold">{unatt}</div><div className="text-[11px] text-ink-500">excluded from accuracy</div></Card>
      <Card className="p-4"><div className="text-xs font-semibold text-ink-500">Answering vs explanations</div><div className="font-head text-xl font-extrabold">{sec(ansMs)} <span className="text-sm text-ink-400">/ {sec(expMs)}</span></div></Card>
    </div>
    {isDiag ? <Card className="mt-4 p-5"><h2 className="mb-3 font-bold">By domain (diagnostic sample)</h2><div className="grid gap-2 sm:grid-cols-2">{DOMAINS.map(dm => { const da = atts.filter(a => a.domain === dm.id); if (!da.length) return null; const c = da.filter(a => a.correct).length
      return <div key={dm.id} className="rounded-xl border border-ink-200 p-3"><div className="flex justify-between text-sm font-semibold"><span>{dm.name}</span><span>{c}/{da.length}</span></div><div className="mt-1 text-xs text-ink-500">{c / da.length < 0.67 ? 'Likely priority — ' : ''}needs check: {da.length} items can't certify a skill.</div><div className="mt-2 flex flex-wrap gap-1">{[...new Set(da.map(a => a.skill))].map(sk => { const sa = da.filter(a => a.skill === sk); return <Chip key={sk} tone="gray">{skillById(sk).name}: {sa.filter(a => a.correct).length}/{sa.length}</Chip> })}</div></div> })}</div></Card>
      : <Card className="mt-4 p-5"><h2 className="mb-3 font-bold">Skills practiced</h2><ul className="space-y-2">{skills.map(sk => { const sa = atts.filter(a => a.skill === sk); const ev = skillEvidence(getDB(), data, sk); const diffs = [...new Set(sa.map(a => ['', 'easy', 'medium', 'hard'][a.difficulty]))]
        return <li key={sk} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 p-3 text-sm"><span className="flex-1 font-semibold">{skillById(sk).name}</span><span className="text-ink-600">{sa.filter(a => a.correct).length}/{sa.length} this session · {diffs.join(', ')}</span><StatusChip s={ev.status} /></li> })}</ul>
        {s.ladderLog.length > 0 && <details className="mt-3 text-xs text-ink-600"><summary className="cursor-pointer font-semibold">Difficulty ladder log ({s.ladderLog.length})</summary><ul className="mt-2 space-y-1">{s.ladderLog.map((l, i) => <li key={i}>{skillById(l.skill).name}: level {l.from} → {l.to} ({l.reason})</li>)}</ul></details>}</Card>}
    <Card className="mt-4 p-5"><h2 className="mb-2 font-bold">Questions</h2><ul className="divide-y divide-ink-100">{s.items.map(it => { const a = atts.find(x => x.qid === it.qid); const q = qById(it.qid)
      return <li key={it.position} className="flex items-start gap-3 py-2.5 text-sm">{!a ? <MinusCircle size={18} className="mt-0.5 text-ink-400" /> : a.correct ? <CheckCircle2 size={18} className="mt-0.5 text-teal-600" /> : <XCircle size={18} className="mt-0.5 text-rose-500" />}<div className="min-w-0 flex-1"><div className="truncate">{q.stem}</div><div className="text-xs text-ink-500">{skillById(q.skill).name}{!a ? ' · unattempted' : a.assistance ? ' · assisted' : ''}{!a?.firstExposure && a ? ' · repeat (review only)' : ''}</div>{a && !a.correct && <details className="mt-1 text-xs text-ink-600"><summary className="cursor-pointer text-indigo-700">Explanation</summary>{q.explanation}</details>}</div></li> })}</ul></Card>
    <Card className="mt-4 p-5"><h2 className="mb-2 font-bold">How your plan changed</h2>{changes.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">{changes.map(c => <li key={c}>{c}</li>)}</ul> : <p className="text-sm text-ink-600">No change in priority order.</p>}{s.notes.length > 0 && <p className="mt-2 text-xs text-ink-500">Session notes: {s.notes.join(' ')}</p>}</Card>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">{next && <Link to="/app" className="btn-primary flex-1 py-3">Next: {next.nextAction.toLowerCase()} <ArrowRight size={16} /></Link>}<Link to="/app/notebook" className="btn-secondary">Open notebook</Link><Link to="/app/progress" className="btn-secondary">Progress</Link></div>
  </>
}
