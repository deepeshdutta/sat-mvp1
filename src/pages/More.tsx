import { PenLine, Sparkles, Users, GraduationCap, CalendarRange, Lock } from 'lucide-react'
import { Card, Chip, PageHeader, usePaywall } from '../components/ui'
import { useMe } from '../lib/store'
import { effectiveTier } from '../lib/engine'
import { POLICY } from '../lib/policy'

export default function More() {
  const { data } = useMe(); const paywall = usePaywall(); if (!data) return null
  const tier = effectiveTier(data)
  const items = [
    { icon: Sparkles, name: 'AI tutor', need: 'Max' as const, desc: `Bounded help grounded only in reviewed explanations. ${POLICY.aiMonthlyBudget} interactions/month, disclosed before purchase.` },
    { icon: PenLine, name: 'Writing Skills Lab', need: 'Max' as const, desc: 'Student-authored journal notes, drafting and revision.' },
    { icon: GraduationCap, name: 'College Essay Studio (pilot)', need: 'Max' as const, desc: 'Admission-gated pilot with versioned drafts and student-controlled reviewer comments.' },
    { icon: Users, name: 'Parent summaries', need: 'Plus' as const, desc: 'Student-initiated, scoped, expiring and revocable share links.' },
    { icon: CalendarRange, name: 'Backward-planned calendar & comeback mode', need: 'Plus' as const, desc: 'Plan back from your test date; return after a break without shame or lost history.' },
  ]
  const has = (n: 'Plus' | 'Max') => n === 'Plus' ? tier !== 'free' : tier === 'max'
  return <>
    <PageHeader eyebrow="Coming in MVP2" title="Writing, AI help & more" sub="These features are specified for MVP2 and gated on quality, cost and privacy reviews. Locked items show which tier will include them — no dead ends." />
    <div className="grid gap-3 md:grid-cols-2">{items.map(i => <Card key={i.name} className="flex items-start gap-4 p-5"><div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-indigo-50 text-indigo-600"><i.icon size={22} /></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{i.name}</h3><Chip tone="violet">{i.need}</Chip><Chip tone="gray">MVP2</Chip></div><p className="mt-1 text-sm text-ink-600">{i.desc}</p>
      {has(i.need) ? <p className="mt-3 text-sm font-semibold text-teal-700">Included in your plan — you'll get access when it launches.</p> : <button className="btn-secondary mt-3 text-xs" onClick={() => paywall(i.name, i.need)}><Lock size={13} />Unlock with {i.need}</button>}</div></Card>)}</div>
  </>
}
