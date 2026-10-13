import { Link, useNavigate } from 'react-router-dom'
import { Lock, CalendarCheck, ExternalLink, RefreshCcw } from 'lucide-react'
import { Bar, Card, Chip, EvidenceChip, PageHeader, StatusChip, fmtDate, usePaywall, useToast } from '../components/ui'
import { useMe, getDB, now, DAY } from '../lib/store'
import { allEvidence, effectiveTier, weekStart } from '../lib/engine'
import { startSession } from '../lib/actions'
import { DOMAINS, SKILLS, skillById } from '../data/taxonomy'

export default function Progress() {
  const { data } = useMe(); const paywall = usePaywall(); const nav = useNavigate(); const toast = useToast()
  if (!data) return null
  const d = getDB(); const ev = allEvidence(d, data); const tier = effectiveTier(data)
  const ws = weekStart(), lws = ws - 7 * DAY
  const inRange = (a: number, b: number) => data.attempts.filter(x => x.answeredAt >= a && x.answeredAt < b && !x.invalidatedAt)
  const tw = inRange(ws, now() + 1), lw = inRange(lws, ws)
  const twS = data.sessions.filter(s => s.state === 'completed' && (s.completedAt ?? 0) >= ws).length
  const ind = (xs: typeof tw) => { const i = xs.filter(a => a.assistance === 0 && a.firstExposure); return `${i.filter(a => a.correct).length}/${i.length}` }
  const ast = (xs: typeof tw) => { const i = xs.filter(a => a.assistance > 0); return i.length ? `${i.filter(a => a.correct).length}/${i.length}` : '—' }
  // a like-for-like statement only when the skill has eligible attempts in BOTH windows
  const comp = SKILLS.map(s => { const a = lw.filter(x => x.skill === s.id && x.assistance === 0 && x.firstExposure), b = tw.filter(x => x.skill === s.id && x.assistance === 0 && x.firstExposure); return { s, a, b } }).filter(x => x.a.length >= 3 && x.b.length >= 3)
  const improving = ev.filter(e => e.status === 'improving')
  const dueChecks = data.delayedChecks.filter(c => c.state === 'scheduled')
  const go = (mode: any, topic?: string) => { const r = startSession(mode, { topic }); if (r.error) return toast(r.error); nav('/app/session/' + r.id) }
  return <>
    <PageHeader eyebrow="Progress" title="What the evidence shows" sub="Practice accuracy is not an SAT-score gain. Independent and assisted results are kept separate; unknown skills stay unknown." />
    <Card className="mb-4 p-5"><h2 className="mb-1 font-bold">Weekly summary</h2>
      <p className="text-sm text-ink-700">This week you completed <b>{twS}</b> workout{twS === 1 ? '' : 's'} and answered <b>{tw.length}</b> questions. Independent first-attempt accuracy: <b>{ind(tw)}</b>; assisted: <b>{ast(tw)}</b>.{comp.length > 0 && comp.slice(0, 2).map(c => ` On new ${c.s.name} questions, your accuracy went from ${c.a.filter(x => x.correct).length}/${c.a.length} to ${c.b.filter(x => x.correct).length}/${c.b.length}.`).join('')}</p>
      {dueChecks.length > 0 && <p className="mt-2 text-sm text-ink-700">Next we'll check retention on {dueChecks.map(c => skillById(c.skill).name).join(', ')}.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">{[['Workouts', twS], ['Questions', tw.length], ['Independent', ind(tw)], ['Last week', ind(lw)]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-ink-50 p-3"><div className="font-head text-xl font-extrabold">{v}</div><div className="text-xs text-ink-500">{l}</div></div>)}</div></Card>
    {improving.length > 0 && <Card className="mb-4 border-indigo-200 bg-indigo-50/60 p-5"><h2 className="flex items-center gap-2 font-bold"><RefreshCcw size={18} />Ready to retest?</h2><p className="mt-1 text-sm text-ink-700">{improving.map(e => skillById(e.skill).name).join(', ')} {improving.length > 1 ? 'are' : 'is'} improving. Confirm with a mini-check (skill progress only — it can't measure a total SAT score change), or take a free official Bluebook practice test and enter the result.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">{dueChecks.filter(c => c.dueAt <= now()).slice(0, 1).map(c => <button key={c.id} className="btn-primary" onClick={() => go('delayed_check', c.skill)}>Mini-check: {skillById(c.skill).name}</button>)}<a className="btn-secondary" href="https://bluebook.collegeboard.org/" target="_blank" rel="noreferrer">Bluebook practice <ExternalLink size={14} /></a><Link className="btn-secondary" to="/app/data?new=1">Enter a result</Link></div>
      <p className="mt-2 text-xs text-ink-500">Official score comparisons should be like-for-like (same assessment type) and are self-reported; other study may also explain changes.</p></Card>}
    <div className="space-y-4">{DOMAINS.map(dm => { const sk = ev.filter(e => skillById(e.skill).domain === dm.id); const observed = sk.filter(e => e.n > 0).length
      return <Card key={dm.id} className="p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{dm.name}</h2><span className="text-xs text-ink-500">Coverage: {observed}/{sk.length} skills observed</span></div>
        <div className="space-y-3">{sk.map(e => <div key={e.skill} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{skillById(e.skill).name}</span><StatusChip s={e.status} /><EvidenceChip kind={e.label} />{e.stale && <Chip tone="amber">Stale — new check requested</Chip>}</div>
            <div className="mt-1.5 flex items-center gap-3"><Bar value={e.correct} max={Math.max(e.n, 1)} tone={e.n ? 'bg-teal-500' : 'bg-ink-200'} className="max-w-xs" /><span className="whitespace-nowrap text-xs text-ink-600">{e.n ? `${e.correct}/${e.n} independent` : 'No evidence — not zero'}{e.assistedN ? ` · assisted ${e.assistedCorrect}/${e.assistedN}` : ''}</span></div>
            {e.status === 'improving' && e.coverageGap && <p className="mt-1 text-xs text-amber-700">Progress observed; additional evidence needed (not enough items to verify "secured").</p>}
            {e.delayed && <p className="mt-1 flex items-center gap-1 text-xs text-ink-500"><CalendarCheck size={12} />Delayed check {e.delayed.state === 'done' ? `done: ${e.delayed.result?.correct}/${e.delayed.result?.total}` : `due ${fmtDate(e.delayed.dueAt)}`}</p>}</div>
          {tier === 'free' ? <button className="btn-ghost justify-start px-0 text-xs text-ink-500 sm:justify-end" onClick={() => paywall('Deeper progress views', 'Plus')}><Lock size={12} />Difficulty mix</button>
            : <div className="text-xs text-ink-600 sm:text-right">{e.n ? `${e.mediumPlus} medium+ · ${e.sessions} sessions · last ${fmtDate(e.lastAt!)}` : '—'}</div>}
        </div>)}</div></Card> })}</div>
  </>
}
