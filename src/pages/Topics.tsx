import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Play, Lock } from 'lucide-react'
import { Card, Chip, PageHeader, StatusChip, usePaywall, useToast, cx } from '../components/ui'
import { useMe, getDB } from '../lib/store'
import { effectiveTier, servable, skillEvidence } from '../lib/engine'
import { startSession } from '../lib/actions'
import { DOMAINS, SKILLS } from '../data/taxonomy'

export default function Topics() {
  const { data } = useMe(); const nav = useNavigate(); const paywall = usePaywall(); const toast = useToast()
  const [q, setQ] = useState(''); const [len, setLen] = useState(20)
  if (!data) return null
  const tier = effectiveTier(data)
  const ql = q.trim().toLowerCase()
  const match = (s: typeof SKILLS[0]) => !ql || s.name.toLowerCase().includes(ql) || s.synonyms.some(x => x.includes(ql)) || DOMAINS.find(d => d.id === s.domain)!.name.toLowerCase().includes(ql)
  const bank = servable(getDB())
  const go = (skill: string) => { const r = startSession('topic', { topic: skill, budgetSec: len * 60 }); if (r.paywall) return paywall('More than 1 workout per day', 'Plus'); if (r.error) return toast(r.error); nav('/app/session/' + r.id) }
  const results = SKILLS.filter(match)
  return <>
    <PageHeader eyebrow="Practice" title="Topic picker" sub="Search any SAT skill by name or everyday words (try “comma splice”, “slope”, “vocab”). Topic sessions stay 100% on the chosen skill." />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input className="input pl-10" placeholder="Search skills and synonyms…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search topics" /></div>
      <div className="flex rounded-xl border border-ink-200 bg-white p-1">{[5, 10, 20].map(m => <button key={m} onClick={() => { if (m !== 20 && tier === 'free') return paywall('Flexible 5/10-minute sessions', 'Plus'); setLen(m) }} className={cx('flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold', len === m ? 'bg-indigo-600 text-white' : 'text-ink-600')}>{m !== 20 && tier === 'free' && <Lock size={12} />}{m} min</button>)}</div>
    </div>
    {results.length === 0 && <p className="text-sm text-ink-600">No skills match “{q}”. Try a broader word like “grammar” or “algebra”.</p>}
    {DOMAINS.map(dm => { const sk = results.filter(s => s.domain === dm.id); if (!sk.length) return null
      return <section key={dm.id} className="mb-6"><h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">{dm.name}<Chip tone={dm.section === 'RW' ? 'violet' : 'sky'}>{dm.section === 'RW' ? 'R&W' : 'Math'}</Chip></h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sk.map(s => { const e = skillEvidence(getDB(), data, s.id); const n = bank.filter(x => x.skill === s.id).length; const unseen = bank.filter(x => x.skill === s.id && !data.attempts.some(a => a.qid === x.id)).length
          return <Card key={s.id} className="flex flex-col p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-bold">{s.name}</h3><StatusChip s={e.status} /></div>
            <p className="mt-1 text-xs text-ink-500">Also: {s.synonyms.slice(0, 3).join(', ')}</p>
            <div className="mt-3 text-xs text-ink-600">{e.n ? `${e.correct}/${e.n} recent independent` : 'No evidence yet'} · {unseen}/{n} unseen items</div>
            <button className="btn-secondary mt-3" onClick={() => go(s.id)}><Play size={14} />{unseen ? 'Practice' : 'Review repeats'}</button></Card> })}</div></section> })}
  </>
}
