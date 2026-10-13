import { Link, useNavigate } from 'react-router-dom'
import { Play, HelpCircle, ChevronRight, Flame, Trophy, CalendarDays, RotateCcw, Compass, Sparkles, Info } from 'lucide-react'
import { useState } from 'react'
import { Card, Chip, EvidenceChip, PriorityChip, Ring, usePaywall, useToast, cx } from '../components/ui'
import { useMe, now, DAY, todayKey } from '../lib/store'
import { currentPlan, dayStreak, workoutsThisWeek, xpOf, levelOf, BADGES, freeCapReached, weeksGoalMet } from '../lib/engine'
import { startSession } from '../lib/actions'
import { domainById, skillById } from '../data/taxonomy'
import { DAYS } from './Onboarding'

export function cardTitle(c: { skill?: string; domain: string }) { return c.skill ? skillById(c.skill).name : domainById(c.domain).name }

export function WeekCalendar() {
  const { data } = useMe(); if (!data) return null
  // Lightweight calendar: spread the weekly goal across available days; missed days are not piled up.
  const ws = (() => { const d = new Date(now()); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); return d.getTime() - day * DAY })()
  const avail = data.goals.availability.length ? data.goals.availability : DAYS
  const planned = new Set<string>(); const step = avail.length / Math.max(1, Math.min(data.goals.weeklyWorkouts, avail.length))
  for (let i = 0; i < Math.min(data.goals.weeklyWorkouts, avail.length); i++) planned.add(avail[Math.floor(i * step)])
  const done = new Set(data.sessions.filter(s => s.state === 'completed').map(s => todayKey(s.completedAt)))
  const today = todayKey()
  return <div className="grid grid-cols-7 gap-1.5">{DAYS.map((d, i) => { const k = todayKey(ws + i * DAY + 12 * 3600_000); const isDone = done.has(k), isPlan = planned.has(d), isToday = k === today, past = k < today
    return <div key={d} className={cx('rounded-xl border p-2 text-center', isToday ? 'border-indigo-500 bg-indigo-50' : 'border-ink-200 bg-white')}><div className="text-[11px] font-semibold text-ink-500">{d}</div><div className={cx('mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full text-xs font-bold', isDone ? 'bg-teal-500 text-white' : isPlan ? (past ? 'bg-ink-100 text-ink-400' : 'bg-indigo-100 text-indigo-700') : 'text-ink-300')}>{isDone ? '✓' : isPlan ? '•' : ''}</div></div> })}</div>
}

export default function Today() {
  const { user, data } = useMe(); const nav = useNavigate(); const paywall = usePaywall(); const toast = useToast()
  const [why, setWhy] = useState(false)
  if (!data || !user) return null
  const plan = currentPlan(data)
  const active = plan?.cards.filter(c => c.evidence !== 'secured') ?? []
  const primary = active[0], secondary = active[1]
  const hasBaseline = data.reports.length > 0 || data.sessions.some(s => s.mode.startsWith('diagnostic') && s.state === 'completed')
  const due = data.notebook.filter(m => m.state === 'open' && m.reviewDue <= now())
  const dueChecks = data.delayedChecks.filter(c => c.state === 'scheduled' && c.dueAt <= now())
  const inProgress = data.sessions.find(s => s.state !== 'completed')
  const week = workoutsThisWeek(data), streak = dayStreak(data), xp = xpOf(data), lv = levelOf(xp)
  const go = (mode: any, topic?: string) => { const r = startSession(mode, { topic }); if (r.paywall) return paywall('More than 1 workout per day', 'Plus'); if (r.error) return toast(r.error); nav('/app/session/' + r.id) }
  const primaryMode = primary?.evidence === 'observed' ? (() => go('weakness')) : primary ? (() => go('diagnostic_focused', primary.domain)) : (() => go('diagnostic_starter'))
  const greeting = new Date(now()).getHours() < 12 ? 'Good morning' : new Date(now()).getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const notice = data.notices.find(n => !n.read)
  return <>
    <div className="mb-6"><div className="eyebrow">Today</div><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{greeting} 👋</h1><p className="text-ink-600">{data.goals.targetTotal ? `Working toward your ${data.goals.targetTotal} goal${data.goals.testDate ? ` for ${data.goals.testDate}` : ''}.` : <>General improvement plan. <Link className="font-semibold text-indigo-700" to="/app/settings">Add a goal</Link> any time.</>}</p></div>
    {notice && <Card className="mb-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><Info size={18} className="mt-0.5" /><span className="flex-1">{notice.text}</span><Link to="/app/settings#notices" className="font-semibold underline">View</Link></Card>}
    {inProgress && <Card className="mb-4 flex flex-col gap-3 border-indigo-200 bg-indigo-50 p-4 sm:flex-row sm:items-center"><RotateCcw className="text-indigo-600" /><div className="flex-1 text-sm"><b>You have a session in progress.</b> Saved answers are kept; the timer resumes where it was.</div><Link className="btn-primary" to={'/app/session/' + inProgress.id}>Resume</Link></Card>}
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {!hasBaseline ? <Card className="p-6"><Compass className="text-teal-600" size={28} /><h2 className="mt-3 text-xl font-bold">Start with a baseline</h2><p className="mt-1 text-ink-600">Take the 24-question starter diagnostic (3 per domain, resumable in two section blocks) or add a score report. Missing evidence is never shown as zero.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button className="btn-primary" onClick={() => go('diagnostic_starter')}><Play size={16} />Start diagnostic</button><Link to="/app/data?new=1" className="btn-secondary">Enter a score report</Link></div></Card>
          : primary && <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white sm:p-6">
              <div className="flex flex-wrap items-center gap-2"><span className="chip bg-white/15 text-white">Primary workout</span><span className="chip bg-white/15 text-white">{primary.priority} priority</span><span className="chip bg-white/15 text-white">{primary.evidence}</span></div>
              <h2 className="mt-3 text-2xl font-extrabold text-white">{primary.evidence === 'observed' ? `Fix ${cardTitle(primary).toLowerCase()}` : `Check ${cardTitle(primary)}`}</h2>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">{(primary.evidence === 'observed' ? [['3 min', 'Refresher'], ['12 min', 'Practice'], ['5 min', 'Review']] : [['~12 min', 'Focused check'], ['6–12', 'New items'], ['After', 'Feedback']]).map(([a, b]) => <div key={b} className="rounded-xl bg-white/10 p-2.5"><div className="font-head text-base font-bold sm:text-lg">{a}</div><div className="text-indigo-100">{b}</div></div>)}</div>
            </div>
            <div className="p-5 sm:p-6">
              <button className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700" onClick={() => setWhy(!why)}><HelpCircle size={16} />Why this?</button>
              {why && <div className="mt-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">{primary.reason}<div className="mt-1 text-xs text-indigo-700">Evidence: {primary.evidenceRef} · {plan.policyVersion}</div></div>}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button className="btn-primary flex-1 py-3" onClick={primaryMode}><Play size={16} />{primary.nextAction}</button><Link to="/app/plan" className="btn-secondary">Full plan</Link></div>
              {freeCapReached(data) && primary.evidence === 'observed' && <p className="mt-2 text-xs text-ink-500">You've used today's free workout. Diagnostics and review stay free. <button className="font-semibold text-indigo-700" onClick={() => paywall('Unlimited daily workouts', 'Plus')}>Upgrade</button></p>}
            </div>
          </Card>}
        {(due.length > 0 || dueChecks.length > 0 || secondary) && <Card className="p-5"><h3 className="font-bold">Optional small task</h3>
          {due.length > 0 ? <div className="mt-3 flex items-center gap-3"><div className="flex-1 text-sm text-ink-700">{due.length} mistake{due.length > 1 ? 's are' : ' is'} due for a check-back with new questions on the same skill.</div><button className="btn-secondary" onClick={() => go('review')}>Review</button></div>
            : dueChecks.length > 0 ? <div className="mt-3 flex items-center gap-3"><div className="flex-1 text-sm text-ink-700">Delayed check due: <b>{skillById(dueChecks[0].skill).name}</b> — 5 new medium+ questions to confirm retention.</div><button className="btn-secondary" onClick={() => go('delayed_check', dueChecks[0].skill)}>Start</button></div>
              : secondary && <div className="mt-3 flex items-center gap-3"><div className="flex-1 text-sm text-ink-700">Next up: <b>{cardTitle(secondary)}</b> <EvidenceChip kind={secondary.evidence} /></div><Link to="/app/plan" className="btn-ghost">Preview <ChevronRight size={14} /></Link></div>}
        </Card>}
        <Card className="p-5"><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold"><CalendarDays size={18} />This week</h3><span className="text-xs text-ink-500">Missed days don't pile up</span></div><WeekCalendar />{secondary && <p className="mt-3 text-sm text-ink-600">Next session preview: <b>{cardTitle(secondary)}</b> — {secondary.nextAction.toLowerCase()}.</p>}</Card>
      </div>
      <div className="space-y-4">
        <Card className="flex items-center gap-4 p-5"><Ring value={week} max={data.goals.weeklyWorkouts} label={<><div className="font-head text-lg font-extrabold">{week}/{data.goals.weeklyWorkouts}</div><div className="text-[10px] text-ink-500">workouts</div></>} /><div><div className="font-bold">Weekly goal</div><p className="text-sm text-ink-600">{week >= data.goals.weeklyWorkouts ? 'Goal reached — great consistency!' : `${data.goals.weeklyWorkouts - week} more to hit your goal.`}</p>{weeksGoalMet(data) > 1 && <p className="text-xs text-teal-700">{weeksGoalMet(data)} weeks in a row</p>}</div></Card>
        <Card className="grid grid-cols-2 gap-3 p-5"><div><div className="flex items-center gap-1 text-xs font-semibold text-ink-500"><Flame size={14} className="text-amber-500" />Practice days</div><div className="font-head text-2xl font-extrabold">{streak}</div><div className="text-[11px] text-ink-500">Private · rest days are fine</div></div><div><div className="flex items-center gap-1 text-xs font-semibold text-ink-500"><Sparkles size={14} className="text-indigo-500" />Level {lv.level}</div><div className="font-head text-2xl font-extrabold">{xp}<span className="text-sm text-ink-400"> XP</span></div><div className="mt-1 h-1.5 rounded-full bg-ink-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div></div></Card>
        <Card className="p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><Trophy size={18} className="text-amber-500" />Badges</h3><div className="grid grid-cols-4 gap-2">{BADGES.map(b => { const got = data.badges.some(x => x.id === b.id); return <div key={b.id} title={`${b.name}: ${b.desc}`} className={cx('grid aspect-square place-items-center rounded-xl text-center text-[10px] font-semibold leading-tight', got ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-ink-50 text-ink-300')}><span className="text-lg">{got ? '🏅' : '🔒'}</span>{b.name}</div> })}</div><p className="mt-3 text-xs text-ink-500">Badges celebrate effort and demonstrated learning — never flawless streaks. Nothing here is public.</p></Card>
        {plan && <Card className="p-5"><h3 className="mb-2 font-bold">Top priorities</h3><ul className="space-y-2">{active.slice(0, 4).map((c, i) => <li key={c.key} className="flex items-center gap-2 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-ink-100 text-xs font-bold">{i + 1}</span><span className="flex-1 truncate">{cardTitle(c)}</span><PriorityChip p={c.priority} /></li>)}</ul></Card>}
      </div>
    </div>
  </>
}
