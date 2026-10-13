import { Link } from 'react-router-dom'
import { CreditCard, PauseCircle, PlayCircle, XCircle, Receipt, Wrench, RotateCcw } from 'lucide-react'
import { Card, Chip, PageHeader, fmtDate, fmtDT, useToast } from '../components/ui'
import { update, useMe, uid, now, DAY, currentUser } from '../lib/store'
import { POLICY } from '../lib/policy'
import { deliverWebhook, effectiveTier } from '../lib/engine'

export default function Billing() {
  const { user, data } = useMe(); const toast = useToast()
  if (!data || !user) return null
  const s = data.sub, tier = effectiveTier(data)
  const send = (type: string, payload: any = {}, dupId?: string) => { let r = ''; update(d => { r = deliverWebhook(d, { id: dupId ?? 'evt_' + uid().slice(0, 12), type, userId: currentUser(d)!.id, payload }) }); return r }
  const refundable = s.firstPurchaseAt && now() - s.firstPurchaseAt < POLICY.refundDays * DAY && s.refunds === 0 && s.state === 'active'
  return <>
    <PageHeader eyebrow="Subscription" title="Plan & billing" sub="Cancel anytime with access to the end of the paid month. Your learning data is never deleted on downgrade or cancellation." />
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold capitalize">{tier} plan</h2><Chip tone={s.state === 'active' ? 'green' : s.state === 'past_due' ? 'amber' : s.state === 'paused' ? 'sky' : 'gray'}>{s.state === 'none' ? 'Free' : s.state.replace('_', ' ')}</Chip>{s.cancelAtPeriodEnd && <Chip tone="rose">Cancels {fmtDate(s.periodEnd!)}</Chip>}</div>
        {s.state === 'none' || s.state === 'canceled' ? <><p className="mt-2 text-sm text-ink-600">You're on Free: the full learning loop with 1 practice workout per day. Diagnostics and reviews are never capped.</p><Link to="/pricing" className="btn-primary mt-4"><CreditCard size={16} />Compare plans</Link></> : <>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-ink-500">Price</dt><dd className="font-semibold">${POLICY.prices[s.tier as 'plus' | 'max']}/month</dd></div><div><dt className="text-ink-500">Current period ends</dt><dd className="font-semibold">{s.periodEnd ? fmtDate(s.periodEnd) : '—'}</dd></div><div><dt className="text-ink-500">Term ends</dt><dd className="font-semibold">{s.termEnd ? fmtDate(s.termEnd) : '—'}</dd></div></dl>
          {s.state === 'past_due' && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Payment failed — grace until {fmtDT(s.graceUntil!)}. After that you'll move to Free; your data stays.</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {s.tier === 'plus' && s.state === 'active' && <Link to="/pricing" className="btn-primary">Upgrade to Max (prorated)</Link>}
            {s.state === 'active' && <button className="btn-secondary" onClick={() => { send('customer.subscription.paused'); toast('Billing paused. Break mode: reminders stop, history kept.') }}><PauseCircle size={16} />Pause (break mode)</button>}
            {s.state === 'paused' && <button className="btn-secondary" onClick={() => { send('customer.subscription.resumed'); toast('Welcome back! Subscription resumed.') }}><PlayCircle size={16} />Resume</button>}
            {s.state === 'past_due' && <button className="btn-primary" onClick={() => { send('invoice.payment_succeeded'); toast('Payment updated.') }}>Update payment method</button>}
            {s.state === 'active' && (s.cancelAtPeriodEnd ? <button className="btn-secondary" onClick={() => send('customer.subscription.updated', { cancelAtPeriodEnd: false })}>Keep my plan</button> : <button className="btn-secondary text-rose-700" onClick={() => { if (confirm('Cancel at the end of this paid month? You keep access until then and all your data afterward.')) send('customer.subscription.updated', { cancelAtPeriodEnd: true }) }}><XCircle size={16} />Cancel</button>)}
            {refundable && <button className="btn-secondary" onClick={() => { if (confirm('Request the 7-day first-purchase refund? Paid access ends now; your data is kept.')) { send('charge.refunded'); toast('Refund issued and reconciled.') } }}><RotateCcw size={16} />7-day refund</button>}
          </div></>}
      </Card>
      <Card className="p-5"><h3 className="mb-2 flex items-center gap-2 font-bold"><Receipt size={18} />Receipts & invoices</h3>{data.invoices.length ? <ul className="divide-y divide-ink-100 text-sm">{data.invoices.map(i => <li key={i.id} className="flex items-center justify-between gap-2 py-2"><div><div className="font-semibold">{i.desc}</div><div className="text-xs text-ink-500">{fmtDate(i.at)} · {i.id}</div></div><div className="text-right"><div>${i.amount.toFixed(2)}</div><Chip tone={i.status === 'paid' ? 'green' : i.status === 'failed' ? 'rose' : 'gray'}>{i.status}</Chip></div></li>)}</ul> : <p className="text-sm text-ink-500">No invoices yet.</p>}</Card>
    </div>
    <Card className="mt-4 border-dashed p-5"><h3 className="flex items-center gap-2 font-bold"><Wrench size={18} />Demo: simulate processor events</h3><p className="mt-1 text-sm text-ink-600">There's no real payment processor in this prototype. These buttons deliver mock signed webhooks so you can see every lifecycle state. Entitlements change only when an event is processed; duplicates are ignored by event id.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-secondary text-xs" disabled={s.state !== 'active'} onClick={() => send('invoice.payment_failed')}>Renewal payment fails</button>
        <button className="btn-secondary text-xs" disabled={s.state !== 'past_due'} onClick={() => update(d => { const u = d.data[currentUser(d)!.id]; u.sub.graceUntil = now() - 1 })}>Expire grace period now</button>
        <button className="btn-secondary text-xs" disabled={!s.cancelAtPeriodEnd} onClick={() => update(d => { const u = d.data[currentUser(d)!.id]; u.sub.periodEnd = now() - 1 })}>Reach period end</button>
        <button className="btn-secondary text-xs" onClick={() => { const id = 'evt_dup_' + uid().slice(0, 6); const a = send('customer.subscription.created', { tier: 'plus' }, id); const b = send('customer.subscription.created', { tier: 'plus' }, id); toast(`1st delivery: ${a} · 2nd delivery: ${b}`) }}>Send duplicate "created" webhook</button>
      </div></Card>
  </>
}
