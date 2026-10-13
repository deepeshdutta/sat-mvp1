import { useNavigate, Link } from 'react-router-dom'
import { Compass, Crosshair, CheckCircle2 } from 'lucide-react'
import { Card, Chip, PageHeader, fmtDate, useToast } from '../components/ui'
import { useMe, getDB } from '../lib/store'
import { servable } from '../lib/engine'
import { startSession } from '../lib/actions'
import { DOMAINS } from '../data/taxonomy'

export default function Diagnostic() {
  const { data } = useMe(); const nav = useNavigate(); const toast = useToast()
  if (!data) return null
  const starter = data.sessions.filter(s => s.mode === 'diagnostic_starter')
  const lastStarter = starter[starter.length - 1]
  const go = (mode: any, topic?: string) => { const r = startSession(mode, { topic }); if (r.error) return toast(r.error); nav('/app/session/' + r.id) }
  const bank = servable(getDB())
  return <>
    <PageHeader eyebrow="Diagnostics" title="Find out where to focus" sub="Diagnostics are independent first attempts: no hints until the block ends. They produce a learning baseline — never an official SAT score or percentile." />
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-6"><Compass className="text-teal-600" size={28} /><h2 className="mt-3 text-xl font-bold">Starter diagnostic</h2><p className="mt-1 text-sm text-ink-600">24 questions · 3 per domain · Reading & Writing block, then Math block. Stop any time and resume without losing answers.</p>
        {lastStarter?.state === 'completed' ? <div className="mt-4 flex items-center gap-2 text-sm text-teal-700"><CheckCircle2 size={16} />Completed {fmtDate(lastStarter.completedAt!)} — <Link className="font-semibold underline" to={'/app/report/' + lastStarter.id}>view baseline</Link></div> : null}
        <button className="btn-primary mt-4 w-full" onClick={() => go('diagnostic_starter')}>{lastStarter && lastStarter.state !== 'completed' ? 'Resume starter diagnostic' : lastStarter ? 'Retake with new items' : 'Start starter diagnostic'}</button>
        <p className="mt-2 text-xs text-ink-500">Three items per domain cannot certify mastery — they show where more evidence is needed.</p></Card>
      <Card className="p-6"><Crosshair className="text-indigo-600" size={28} /><h2 className="mt-3 text-xl font-bold">Focused checks</h2><p className="mt-1 text-sm text-ink-600">6–12 new items in one domain, balanced across its skills and difficulty. Feedback is released after the block.</p>
        <div className="mt-4 space-y-2">{DOMAINS.map(d => { const unseen = bank.filter(q => q.domain === d.id && !data.attempts.some(a => a.qid === q.id)).length; return <div key={d.id} className="flex items-center gap-2 rounded-xl border border-ink-200 p-2.5 pl-3"><div className="flex-1 text-sm font-semibold">{d.name}<div className="text-xs font-normal text-ink-500">{unseen} unseen items</div></div><Chip tone={d.section === 'RW' ? 'violet' : 'sky'}>{d.section === 'RW' ? 'R&W' : 'Math'}</Chip><button className="btn-secondary px-3 py-1.5 text-xs" disabled={!unseen} onClick={() => go('diagnostic_focused', d.id)}>Check</button></div> })}</div></Card>
    </div>
  </>
}
