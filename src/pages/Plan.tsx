import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ShieldCheck } from 'lucide-react'
import { Card, Chip, EvidenceChip, PageHeader, PriorityChip, Modal, fmtDT, usePaywall, useToast } from '../components/ui'
import { useMe, getDB } from '../lib/store'
import { currentPlan, planDiff, skillEvidence } from '../lib/engine'
import { startSession } from '../lib/actions'
import { domainById, SKILLS } from '../data/taxonomy'
import { cardTitle } from './Today'

export default function PlanPage() {
  const { data } = useMe(); const nav = useNavigate(); const paywall = usePaywall(); const toast = useToast()
  const [hist, setHist] = useState(false)
  if (!data) return null
  const plan = currentPlan(data)
  if (!plan) return <PageHeader title="Improvement Plan" sub="Complete onboarding to create your plan." />
  const active = plan.cards.filter(c => c.evidence !== 'secured'), secured = plan.cards.filter(c => c.evidence === 'secured')
  const act = (c: typeof plan.cards[0]) => {
    const r = c.evidence === 'observed' && c.skill ? startSession('topic', { topic: c.skill }) : startSession('diagnostic_focused', { topic: c.domain })
    if (r.paywall) return paywall('More than 1 workout per day', 'Plus'); if (r.error) return toast(r.error); nav('/app/session/' + r.id)
  }
  const diff = planDiff(data.plans[1], plan)
  return <>
    <PageHeader eyebrow="Improvement Plan" title="Your ranked priorities" sub="Report bands choose where to investigate; your recent independent answers choose what to practice. Re-ranked only after sessions, new anchor reports, delayed checks or goal changes." actions={<button className="btn-secondary" onClick={() => setHist(true)}><History size={16} />Plan history</button>} />
    <Card className="mb-4 p-4 text-sm text-ink-700"><div className="flex flex-wrap items-center gap-2"><b>Last updated</b> {fmtDT(plan.createdAt)} · <span>{plan.trigger}</span><Chip tone="gray">{plan.policyVersion}</Chip></div>{diff.length > 0 && <ul className="mt-2 list-disc pl-5 text-ink-600">{diff.map(x => <li key={x}>{x}</li>)}</ul>}</Card>
    <div className="grid gap-3 md:grid-cols-2">{active.map((c, i) => {
      const children = SKILLS.filter(s => s.domain === c.domain)
      return <Card key={c.key} className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-semibold text-ink-500">#{i + 1} · {domainById(c.domain).name} · {domainById(c.domain).section === 'RW' ? 'Reading & Writing' : 'Math'}</div><h3 className="mt-1 text-lg font-bold">{cardTitle(c)}</h3></div><PriorityChip p={c.priority} /></div>
        <div className="mt-2"><EvidenceChip kind={c.evidence} /></div>
        <p className="mt-3 text-sm text-ink-700">{c.reason}</p>
        <div className="mt-3 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-600"><b>Evidence:</b> {c.evidenceRef}<br /><b>Reassess:</b> {c.reassess}</div>
        {!c.skill && <div className="mt-3 flex flex-wrap gap-1">{children.map(s => { const e = skillEvidence(getDB(), data, s.id); return <Chip key={s.id} tone={e.n ? 'teal' : 'gray'}>{s.name}: {e.n ? `${e.correct}/${e.n}` : 'unknown'}</Chip> })}</div>}
        <div className="mt-auto pt-4"><button className="btn-primary w-full" onClick={() => act(c)}>{c.nextAction}</button></div>
      </Card> })}</div>
    <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-bold"><ShieldCheck size={18} className="text-green-600" />Secured skills</h2>
    {secured.length ? <div className="grid gap-3 md:grid-cols-3">{secured.map(c => <Card key={c.key} className="p-4"><div className="font-semibold">{cardTitle(c)}</div><div className="text-xs text-ink-500">{c.evidenceRef}</div></Card>)}</div> : <p className="text-sm text-ink-600">None yet. "Secured" requires 14/15 recent independent correct across 3 sessions plus a delayed check 3–7 days later. A domain is never secured just because one child skill improved.</p>}
    <Modal open={hist} onClose={() => setHist(false)} title="Plan history" wide>
      <p className="mb-3 text-sm text-ink-600">Old plans are kept, not overwritten, so every change is explainable.</p>
      <ul className="space-y-3">{data.plans.map((p, i) => <li key={p.id} className="rounded-xl border border-ink-200 p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><b>{p.trigger}</b><span className="text-ink-500">{fmtDT(p.createdAt)}</span></div><div className="mt-1 text-xs text-ink-600">Top 3: {p.cards.filter(c => c.evidence !== 'secured').slice(0, 3).map(cardTitle).join(' → ')}</div>{data.plans[i + 1] && <ul className="mt-1 text-xs text-ink-500">{planDiff(data.plans[i + 1], p).slice(0, 3).map(x => <li key={x}>• {x}</li>)}</ul>}</li>)}</ul>
    </Modal>
  </>
}
