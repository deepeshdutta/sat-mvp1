import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Compass } from 'lucide-react'
import { Card, cx } from '../components/ui'
import { update, myData, currentUser, track } from '../lib/store'
import { rerank } from '../lib/engine'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export default function Onboarding() {
  const nav = useNavigate()
  const d0 = myData()!
  const [g, setG] = useState({ ...d0.goals, targetTotal: d0.goals.targetTotal?.toString() ?? '', targetRW: d0.goals.targetRW?.toString() ?? '', targetMath: d0.goals.targetMath?.toString() ?? '', testDate: d0.goals.testDate ?? '' })
  const [tz, setTz] = useState(currentUser()!.timezone)
  const [err, setErr] = useState('')
  const num = (s: string) => s.trim() === '' ? null : Number(s)
  const finish = (route: 'report' | 'diagnostic') => {
    const t = num(g.targetTotal), rw = num(g.targetRW), m = num(g.targetMath)
    if (t != null && (t < 400 || t > 1600)) return setErr('SAT target must be between 400 and 1600.')
    if ([rw, m].some(v => v != null && (v < 200 || v > 800))) return setErr('Section goals must be between 200 and 800.')
    update(d => {
      const u = myData(d)!; const usr = currentUser(d)!
      u.goals = { ...u.goals, targetTotal: t, targetRW: rw, targetMath: m, testDate: g.testDate || null, weeklyWorkouts: g.weeklyWorkouts, availability: g.availability, sectionPreference: g.sectionPreference, version: u.goals.version + 1 }
      usr.timezone = tz; u.onboarded = true
      rerank(d, u, 'Onboarding goals set'); track(d, 'onboarding_done:' + route)
    })
    nav(route === 'report' ? '/app/data?new=1' : '/app/diagnostic')
  }
  return <div className="mx-auto max-w-2xl">
    <div className="eyebrow">Welcome</div><h1 className="mt-1 text-3xl font-extrabold">Let's set up your plan</h1><p className="mt-1 text-ink-600">Everything here is optional and editable later. Goals are your preferences — not predictions.</p>
    <Card className="mt-6 space-y-5 p-5 sm:p-6">
      <div><label className="label">SAT target score <span className="font-normal text-ink-500">(optional)</span></label><input className="input" inputMode="numeric" placeholder="Leave blank for a general improvement plan" value={g.targetTotal} onChange={e => setG({ ...g, targetTotal: e.target.value.replace(/\D/g, '') })} /><p className="mt-1 text-xs text-ink-500">We won't invent a default target. No goal? We'll build a general improvement plan and you can add one later.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Reading & Writing goal</label><input className="input" inputMode="numeric" placeholder="optional" value={g.targetRW} onChange={e => setG({ ...g, targetRW: e.target.value.replace(/\D/g, '') })} /></div><div><label className="label">Math goal</label><input className="input" inputMode="numeric" placeholder="optional" value={g.targetMath} onChange={e => setG({ ...g, targetMath: e.target.value.replace(/\D/g, '') })} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Test date (if known)</label><input type="date" className="input" value={g.testDate} onChange={e => setG({ ...g, testDate: e.target.value })} /></div><div><label className="label">Timezone</label><input className="input" value={tz} onChange={e => setTz(e.target.value)} /></div></div>
      <div><label className="label">Section focus</label><div className="grid grid-cols-3 gap-2">{([['balanced', 'Balanced'], ['RW', 'Reading & Writing'], ['M', 'Math']] as const).map(([v, l]) => <button key={v} onClick={() => setG({ ...g, sectionPreference: v })} className={cx('rounded-xl border px-3 py-2 text-sm font-semibold', g.sectionPreference === v ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-ink-200')}>{l}</button>)}</div><p className="mt-1 text-xs text-ink-500">We never assume your goal splits 50/50 between sections.</p></div>
      <div><label className="label">Workouts per week: {g.weeklyWorkouts}</label><input type="range" min={1} max={7} value={g.weeklyWorkouts} onChange={e => setG({ ...g, weeklyWorkouts: Number(e.target.value) })} className="w-full accent-indigo-600" /></div>
      <div><label className="label">Days you're usually available</label><div className="flex flex-wrap gap-2">{DAYS.map(dd => { const on = g.availability.includes(dd); return <button key={dd} onClick={() => setG({ ...g, availability: on ? g.availability.filter(x => x !== dd) : [...g.availability, dd] })} className={cx('h-10 w-12 rounded-xl border text-sm font-semibold', on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-ink-200 bg-white')}>{dd}</button> })}</div></div>
      {err && <p className="text-sm text-rose-600">{err}</p>}
    </Card>
    <h2 className="mt-8 text-lg font-bold">Do you have a recent score report?</h2>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <button onClick={() => finish('report')} className="card p-5 text-left hover:border-indigo-400"><FileText className="text-indigo-600" /><div className="mt-2 font-bold">Yes — enter my report</div><p className="text-sm text-ink-600">SAT, PSAT/NMSQT, PSAT 10, PSAT 8/9, Bluebook practice or another source.</p></button>
      <button onClick={() => finish('diagnostic')} className="card p-5 text-left hover:border-indigo-400"><Compass className="text-teal-600" /><div className="mt-2 font-bold">No — start a baseline</div><p className="text-sm text-ink-600">A 24-question starter diagnostic. It's a learning baseline, not an official score.</p></button>
    </div>
  </div>
}
