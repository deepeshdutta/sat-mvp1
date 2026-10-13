import { ReactNode, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Menu, X, Sun, ClipboardList, Target, Search, BookOpen, LineChart, CreditCard, Settings, Database, Mail, Flame, LogOut, Shield, Bell, PenLine } from 'lucide-react'
import { useDB, update, currentUser, myData, now } from '../lib/store'
import { logout } from '../lib/auth'
import { billingSweep, dayStreak, effectiveTier, maybeReminder, xpOf, levelOf } from '../lib/engine'
import { cx, fmtDT, Modal } from './ui'

export function Logo({ to = '/' }: { to?: string }) {
  return <Link to={to} className="flex items-center gap-2 font-head text-[17px] font-extrabold text-ink-950" aria-label="Improvement Plan home">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600"><svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M7 22l6-7 5 4 7-10" stroke="white" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
    Improvement<span className="-ml-1.5 text-indigo-600">Plan</span>
  </Link>
}

export function MockInbox({ icon }: { icon?: boolean }) {
  const [open, setOpen] = useState(false)
  const mail = useDB(d => d.mail)
  return <>
    {icon ? <button onClick={() => setOpen(true)} className="relative btn-ghost p-2" aria-label="Open demo inbox" title="Demo inbox"><Mail size={18} />{mail.length > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] text-white">{mail.length}</span>}</button> :
    <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-ink-900 px-3.5 py-2 text-xs font-semibold text-white shadow-pop lg:bottom-5" aria-label="Open demo inbox">
      <Mail size={15} />Demo inbox{mail.length > 0 && <span className="rounded-full bg-indigo-500 px-1.5">{mail.length}</span>}
    </button>}
    <Modal open={open} onClose={() => setOpen(false)} title="Demo inbox (mock email provider)" wide>
      <p className="mb-3 text-sm text-ink-600">This prototype has no email server. Messages that would be emailed (sign-in codes, security notices) appear here instead.</p>
      {mail.length === 0 ? <p className="text-sm text-ink-500">No messages yet.</p> :
        <ul className="divide-y divide-ink-100">{mail.map(m => <li key={m.id} className="py-3"><div className="flex justify-between gap-2 text-xs text-ink-500"><span>To: {m.to}</span><span>{fmtDT(m.at)}</span></div><div className="font-semibold">{m.subject}</div><div className="text-sm text-ink-700">{m.body}</div></li>)}</ul>}
    </Modal>
  </>
}

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const user = useDB(d => currentUser(d))
  const loc = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  const links = [['/pricing', 'Pricing'], ['/resources', 'Free resources'], ['/policies', 'Policies']]
  return <div className="min-h-screen">
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">{links.map(([to, l]) => <NavLink key={to} to={to} className={({ isActive }) => cx('rounded-lg px-3 py-2 text-sm font-semibold', isActive ? 'text-indigo-700' : 'text-ink-600 hover:text-ink-900')}>{l}</NavLink>)}</nav>
        <div className="hidden items-center gap-2 md:flex">{user ? <Link to="/app" className="btn-primary">Open app</Link> : <><Link to="/signin" className="btn-ghost">Sign in</Link><Link to="/signin" className="btn-primary">Start free</Link></>}</div>
        <button className="btn-ghost p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <div className="border-t border-ink-200 bg-white px-4 pb-4 md:hidden">{links.map(([to, l]) => <Link key={to} to={to} className="block py-3 font-semibold text-ink-700">{l}</Link>)}<Link to={user ? '/app' : '/signin'} className="btn-primary mt-2 w-full">{user ? 'Open app' : 'Start free'}</Link></div>}
    </header>
    <Outlet />
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div><Logo /><p className="mt-3 text-sm text-ink-600">Evidence-first SAT practice. Not affiliated with College Board. SAT® is a trademark registered by the College Board, which is not affiliated with and does not endorse this product.</p></div>
        <div className="text-sm"><div className="mb-2 font-semibold">Product</div><Link className="block py-1 text-ink-600" to="/pricing">Pricing</Link><Link className="block py-1 text-ink-600" to="/resources">Free official resources</Link><Link className="block py-1 text-ink-600" to="/signin">Sign in</Link></div>
        <div className="text-sm"><div className="mb-2 font-semibold">Policies</div><Link className="block py-1 text-ink-600" to="/policies#privacy">Privacy</Link><Link className="block py-1 text-ink-600" to="/policies#billing">Billing terms</Link><Link className="block py-1 text-ink-600" to="/policies#recovery">Account recovery</Link></div>
      </div>
      <div className="pb-8 text-center text-xs text-ink-400">MVP1 prototype · data stored only in this browser</div>
    </footer>
    {loc.pathname === '/signin' && <MockInbox />}
  </div>
}

const NAV = [
  { to: '/app', label: 'Today', icon: Sun, end: true },
  { to: '/app/plan', label: 'Plan', icon: Target },
  { to: '/app/topics', label: 'Practice', icon: Search },
  { to: '/app/notebook', label: 'Notebook', icon: BookOpen },
  { to: '/app/progress', label: 'Progress', icon: LineChart },
  { to: '/app/data', label: 'Data Zone', icon: Database },
  { to: '/app/diagnostic', label: 'Diagnostics', icon: ClipboardList },
  { to: '/app/more', label: 'Writing & AI', icon: PenLine },
  { to: '/app/billing', label: 'Subscription', icon: CreditCard },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]
const MOBILE = ['/app', '/app/plan', '/app/topics', '/app/notebook', '/app/progress']

export function AppLayout({ children }: { children?: ReactNode }) {
  const st = useDB(d => ({ user: currentUser(d), data: myData(d), past: d }))
  const loc = useLocation()
  const [drawer, setDrawer] = useState(false)
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => { update(d => { billingSweep(d); maybeReminder(d) }) }, [loc.pathname])
  if (!st.user || !st.data) return <Navigate to="/signin" replace />
  if (!st.data.onboarded && loc.pathname !== '/app/onboarding') return <Navigate to="/app/onboarding" replace />
  const u = st.data, tier = effectiveTier(u), xp = xpOf(u), lv = levelOf(xp), streak = dayStreak(u)
  const unread = u.notices.filter(n => !n.read)
  const inSession = loc.pathname.startsWith('/app/session/')
  const side = <nav className="flex flex-col gap-0.5">{NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold', isActive ? 'bg-indigo-50 text-indigo-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900')}><n.icon size={18} />{n.label}</NavLink>)}</nav>
  return <div className="min-h-screen lg:pl-64">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ink-200 bg-white p-4 lg:flex">
      <div className="mb-6 px-2 pt-1"><Logo to="/app" /></div>
      {side}
      <div className="mt-auto space-y-3">
        <div className="rounded-xl bg-ink-50 p-3 text-xs"><div className="flex items-center justify-between font-semibold"><span>Level {lv.level}</span><span className="text-ink-500">{xp} XP</span></div><div className="mt-2 h-1.5 rounded-full bg-ink-200"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div></div>
        <div className="flex items-center justify-between px-2 text-xs text-ink-500"><span className="truncate">{st.user.email}</span><span className="chip bg-indigo-50 text-indigo-700 uppercase">{tier}</span></div>
        <Link to="/app/admin" className="flex items-center gap-2 px-2 text-xs text-ink-500 hover:text-ink-800"><Shield size={14} />Admin console (demo)</Link>
        <button onClick={() => logout()} className="btn-ghost w-full justify-start text-xs"><LogOut size={14} />Sign out</button>
      </div>
    </aside>
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200 bg-white/90 px-4 backdrop-blur lg:h-16 lg:px-8">
      <div className="lg:hidden"><Logo to="/app" /></div>
      <div className="hidden text-sm text-ink-500 lg:block">{new Date(now()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <div className="flex items-center gap-0.5 sm:gap-2">
        <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200" title="Private practice-day streak"><Flame size={13} />{streak}</span>
        <span className="chip hidden bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 sm:inline-flex">{xp} XP</span>
 <MockInbox icon />
        <Link to="/app/settings#notices" className="relative btn-ghost p-2" aria-label="Notifications"><Bell size={18} />{unread.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />}</Link>
        <button className="btn-ghost p-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
      </div>
    </header>
    {u.sub.state === 'past_due' && <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">Payment failed. You're in a 7-day grace period until {fmtDT(u.sub.graceUntil!)} — <Link to="/app/billing" className="font-semibold underline">update payment</Link>. Your data is always kept.</div>}
    <main className={cx('mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8', !inSession && 'pb-28 lg:pb-10')}>{children ?? <Outlet />}</main>
    {!inSession && <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">{NAV.filter(n => MOBILE.includes(n.to)).map(n => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-indigo-700' : 'text-ink-500')}><n.icon size={20} />{n.label}</NavLink>)}</nav>}
    {drawer && <div className="fixed inset-0 z-50 bg-ink-950/40 lg:hidden" onClick={() => setDrawer(false)}><div className="absolute inset-y-0 right-0 w-72 overflow-y-auto bg-white p-4" onClick={e => e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><Logo to="/app" /><button className="btn-ghost p-2" onClick={() => setDrawer(false)} aria-label="Close menu"><X /></button></div>{side}<div className="mt-4 border-t pt-4 text-xs text-ink-500">{st.user.email} · <span className="uppercase">{tier}</span></div><Link to="/app/admin" className="mt-3 flex items-center gap-2 text-sm text-ink-600"><Shield size={14} />Admin console (demo)</Link><button onClick={() => logout()} className="btn-secondary mt-4 w-full"><LogOut size={14} />Sign out</button></div></div>}
  </div>
}
