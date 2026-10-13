import { ReactNode, createContext, useContext, useState, useEffect } from 'react'
import { X, Lock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

export function Card({ children, className, ...p }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card', className)} {...p}>{children}</div>
}
export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: string; title: string; sub?: ReactNode; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>{eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}<h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>{sub && <p className="mt-1 text-ink-600 max-w-2xl">{sub}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
}
const tones: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200', teal: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200', amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', green: 'bg-green-50 text-green-700 ring-1 ring-green-200', gray: 'bg-ink-100 text-ink-700 ring-1 ring-ink-200', violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
}
export function Chip({ tone = 'gray', children, className }: { tone?: string; children: ReactNode; className?: string }) { return <span className={cx('chip', tones[tone], className)}>{children}</span> }
export function EvidenceChip({ kind }: { kind: string }) {
  const m: Record<string, [string, string]> = { observed: ['teal', 'Observed'], reported: ['sky', 'Reported'], provisional: ['amber', 'Provisional · needs check'], secured: ['green', 'Secured'], 'practice-supported': ['indigo', 'Practice-supported'], none: ['gray', 'No evidence yet'] }
  const [t, l] = m[kind] ?? ['gray', kind]; return <Chip tone={t}>{l}</Chip>
}
export function PriorityChip({ p }: { p: 'high' | 'medium' | 'low' }) { return <Chip tone={p === 'high' ? 'rose' : p === 'medium' ? 'amber' : 'gray'}>{p[0].toUpperCase() + p.slice(1)} priority</Chip> }
export function StatusChip({ s }: { s: string }) { const m: Record<string, string> = { new: 'gray', practicing: 'amber', improving: 'indigo', secured: 'green' }; return <Chip tone={m[s]}>{s[0].toUpperCase() + s.slice(1)}</Chip> }

export function Bar({ value, max = 1, tone = 'bg-indigo-600', className }: { value: number; max?: number; tone?: string; className?: string }) {
  return <div className={cx('h-2 w-full overflow-hidden rounded-full bg-ink-100', className)}><div className={cx('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, (value / Math.max(max, 1e-9)) * 100)}%` }} /></div>
}
export function Ring({ value, max, size = 72, label }: { value: number; max: number; size?: number; label?: ReactNode }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r, f = Math.min(1, value / Math.max(1, max))
  return <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
    <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth="8" fill="none" /><circle cx={size / 2} cy={size / 2} r={r} stroke="#4F46E5" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f)} /></svg>
    <div className="absolute text-center leading-tight">{label}</div>
  </div>
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
    <div className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-pop sm:rounded-2xl sm:p-6', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')} onClick={e => e.stopPropagation()}>
      <div className="mb-3 flex items-start justify-between gap-4"><h2 className="text-lg font-bold">{title}</h2><button className="btn-ghost -m-2 p-2" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      {children}
    </div>
  </div>
}
export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-10 text-center">{icon && <div className="mb-3 text-indigo-500">{icon}</div>}<h3 className="font-bold">{title}</h3>{body && <p className="mt-1 max-w-md text-sm text-ink-600">{body}</p>}{action && <div className="mt-4">{action}</div>}</div>
}

// ---------- Paywall modal: names the locked feature + tier; never discards work ----------
const PaywallCtx = createContext<(feature: string, tier: 'Plus' | 'Max') => void>(() => {})
export const usePaywall = () => useContext(PaywallCtx)
export function PaywallProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<{ feature: string; tier: string } | null>(null)
  return <PaywallCtx.Provider value={(feature, tier) => setSt({ feature, tier })}>{children}
    <Modal open={!!st} onClose={() => setSt(null)} title={`${st?.feature} is a ${st?.tier} feature`}>
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-indigo-50 p-3 text-indigo-800"><Lock size={18} /><span className="text-sm">Unlock <b>{st?.feature}</b> with <b>{st?.tier}</b>. Your current work is saved — nothing is discarded.</span></div>
      <p className="mb-4 text-sm text-ink-600">The core loop — reports, diagnostics, your plan, explanations and the mistake notebook — stays free.</p>
      <div className="flex flex-col gap-2 sm:flex-row"><Link to="/pricing" className="btn-primary flex-1" onClick={() => setSt(null)}><Sparkles size={16} />See plans</Link><button className="btn-secondary flex-1" onClick={() => setSt(null)}>Not now</button></div>
    </Modal>
  </PaywallCtx.Provider>
}

// ---------- toasts ----------
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  const push = (msg: string) => { const id = Math.random(); setItems(i => [...i, { id, msg }]); setTimeout(() => setItems(i => i.filter(x => x.id !== id)), 3800) }
  return <ToastCtx.Provider value={push}>{children}
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">{items.map(t => <div key={t.id} className="pointer-events-auto rounded-xl bg-ink-900 px-4 py-2.5 text-sm text-white shadow-pop">{t.msg}</div>)}</div>
  </ToastCtx.Provider>
}
export const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
export const fmtDT = (t: number) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export function download(name: string, content: string, type = 'application/json') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000) }
