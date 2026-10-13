import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Minus, ArrowRight, ShieldCheck, Target, BookOpen, Timer, LineChart, Database, ExternalLink, Apple, CreditCard } from 'lucide-react'
import { Card, Chip, Modal, useToast } from '../components/ui'
import { POLICY } from '../lib/policy'
import { requestOtp, verifyOtp, validEmail } from '../lib/auth'
import { update, useDB, currentUser, myData, uid, now } from '../lib/store'
import { deliverWebhook } from '../lib/engine'
import { seedDemo } from '../lib/seed'

export function Landing() {
  const feats = [
    [Database, 'Data Collection Zone', 'Enter SAT, PSAT or Bluebook results exactly as reported. We validate ranges and never turn bands into fake percentages.'],
    [Target, 'A ranked plan with reasons', 'Every priority card shows its evidence, its source and the next action — no "costs you 40 points" claims.'],
    [Timer, '20-minute workouts', 'Adaptive practice with a difficulty ladder, one pause, and honest timing that separates answering from reading explanations.'],
    [BookOpen, 'Mistake notebook', 'Wrong answers become notebook entries with guided help and a scheduled check 3–7 days later.'],
    [LineChart, 'Evidence-aware progress', 'Independent vs assisted accuracy, numerator/denominator, and a "secured" status that requires a delayed check.'],
    [ShieldCheck, 'Privacy by default', 'Passwordless sign-in, no date of birth stored, export or delete your data any time.'],
  ] as const
  return <main>
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_#E0E7FF_0%,_transparent_60%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
        <div>
          <Chip tone="indigo">Free core plan · no credit card</Chip>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-[56px]">Know your gaps.<br /><span className="text-indigo-600">Fix them in 20 minutes a day.</span></h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">Improvement Plan turns your score report — or a quick starter diagnostic — into a ranked, explained SAT plan. Every recommendation shows the evidence behind it.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/signin" className="btn-primary px-6 py-3 text-base">Start free <ArrowRight size={18} /></Link><Link to="/pricing" className="btn-secondary px-6 py-3 text-base">Compare plans</Link></div>
          <p className="mt-4 text-sm text-ink-500">Practice accuracy is not an SAT score prediction. We'll tell you exactly what we know and what still needs checking.</p>
        </div>
        <Card className="p-5 sm:p-6 shadow-pop">
          <div className="flex items-center justify-between"><div><div className="eyebrow">Today's plan</div><div className="mt-1 font-head text-xl font-bold">Fix sentence boundaries</div></div><Chip tone="rose">High priority</Chip></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">{[['3 min', 'Refresher'], ['12 min', 'Practice'], ['5 min', 'Review']].map(([a, b]) => <div key={b} className="rounded-xl bg-ink-50 p-3"><div className="font-head text-lg font-bold">{a}</div><div className="text-ink-500">{b}</div></div>)}</div>
          <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900"><b>Why this?</b> You missed this skill in two recent sessions (3 of 7 correct, independent).</div>
          <div className="mt-4 space-y-2">{[['Boundaries', 'Observed · 3/7', 43], ['Linear functions', 'Observed · 5/8', 63], ['Advanced Math', 'Reported band 3 · needs check', 0]].map(([n, e, v]) => <div key={n as string} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3"><div className="flex-1"><div className="text-sm font-semibold">{n}</div><div className="text-xs text-ink-500">{e}</div></div>{(v as number) > 0 ? <div className="w-20"><div className="h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-teal-500" style={{ width: `${v}%` }} /></div></div> : <Chip tone="amber">Check</Chip>}</div>)}</div>
        </Card>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-8 text-center"><div className="eyebrow">How it works</div><h2 className="mt-2 text-3xl font-extrabold">A learning loop, not a pile of questions</h2></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{feats.map(([I, t, b]) => <Card key={t} className="p-5"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><I size={20} /></div><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-ink-600">{b}</p></Card>)}</div>
    </section>
    <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
      <Card className="flex flex-col items-start justify-between gap-6 bg-ink-950 p-8 text-white sm:flex-row sm:items-center"><div><h2 className="text-2xl font-extrabold text-white">Two paths in. Both free.</h2><p className="mt-2 text-ink-300">Have a report? Enter it in the Data Zone. No test yet? Take a 24-question starter diagnostic — a learning baseline, not an official score.</p></div><Link to="/signin" className="btn bg-white text-ink-900 hover:bg-ink-100 px-6 py-3">Get started</Link></Card>
    </section>
  </main>
}

const MATRIX: [string, string | boolean, string | boolean, string | boolean][] = [
  ['Account, Data Collection Zone, score reports', true, true, true],
  ['Starter + focused diagnostics', true, true, true],
  ['Improvement Plan + Today\'s Plan', true, true, true],
  ['Core explanations + mistake notebook', true, true, true],
  ['Daily practice workouts (reviewed bank)', '1/day', 'Uncapped', 'Uncapped'],
  ['Flexible 5/10/20-minute sessions', false, true, true],
  ['Backward-planned calendar, comeback/break mode', false, 'MVP2', 'MVP2'],
  ['Prerequisite repair, pacing/coaching, calculator lessons', false, 'MVP2', 'MVP2'],
  ['Parent summaries (student-controlled)', false, 'MVP2', 'MVP2'],
  ['Deeper progress views', false, true, true],
  [`Bounded AI tutoring (${POLICY.aiMonthlyBudget} interactions/month)`, false, false, 'MVP2'],
  ['Writing Skills Lab', false, false, 'MVP2'],
  ['College Essay Studio pilot', false, false, 'When admitted'],
  ['College-readiness workspace', false, false, 'MVP2'],
  ['Priority support', false, false, true],
]
export function Pricing() {
  const nav = useNavigate(); const toast = useToast()
  const st = useDB(d => ({ user: currentUser(d), data: myData(d) }))
  const [checkout, setCheckout] = useState<null | 'plus' | 'max'>(null)
  const [processing, setProcessing] = useState(false)
  const cell = (v: string | boolean) => v === true ? <Check className="mx-auto text-teal-600" size={18} /> : v === false ? <Minus className="mx-auto text-ink-300" size={18} /> : <span className="text-xs font-semibold text-ink-700">{v}</span>
  const tiers = [
    { id: 'free', name: 'Free', price: '$0', per: 'forever', blurb: 'Know your gaps. The full learning loop, with 1 practice workout a day.', cta: 'Start free' },
    { id: 'plus', name: 'Plus', price: `$${POLICY.prices.plus}`, per: '/month · 6-month term', blurb: 'Uncapped practice, flexible sessions and deeper progress. Most capability lives here.', cta: 'Choose Plus', pop: true },
    { id: 'max', name: 'Max', price: `$${POLICY.prices.max}`, per: '/month · 12-month term', blurb: `Everything in Plus, plus AI help (${POLICY.aiMonthlyBudget}/mo disclosed budget), writing lab and readiness tools as they ship.`, cta: 'Choose Max' },
  ]
  const pay = (method: string) => {
    if (!st.user || !checkout) return
    setProcessing(true)
    // Hosted checkout redirect does NOT grant access; the (mock) webhook does, a moment later.
    setTimeout(() => {
      update(d => { deliverWebhook(d, { id: 'evt_' + uid().slice(0, 12), type: 'customer.subscription.created', userId: st.user!.id, payload: { tier: checkout, method } }) })
      setProcessing(false); setCheckout(null); toast(`Payment confirmed by webhook — ${checkout === 'plus' ? 'Plus' : 'Max'} is active.`); nav('/app/billing')
    }, 1200)
  }
  return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <div className="mx-auto mb-10 max-w-2xl text-center"><div className="eyebrow">Pricing</div><h1 className="mt-2 text-4xl font-extrabold">Simple tiers. Everything published.</h1><p className="mt-3 text-ink-600">No hidden upsells inside a tier. Cancel anytime with access to the end of your paid month. Data is never deleted on downgrade.</p></div>
    <div className="grid gap-4 md:grid-cols-3">{tiers.map(t => <Card key={t.id} className={'relative flex flex-col p-6 ' + (t.pop ? 'ring-2 ring-indigo-600' : '')}>
      {t.pop && <span className="absolute -top-3 left-6 chip bg-indigo-600 text-white">Most popular</span>}
      <h2 className="text-xl font-bold">{t.name}</h2><div className="mt-3 flex items-baseline gap-1"><span className="font-head text-4xl font-extrabold">{t.price}</span><span className="text-sm text-ink-500">{t.per}</span></div>
      <p className="mt-3 flex-1 text-sm text-ink-600">{t.blurb}</p>
      <button className={t.pop ? 'btn-primary mt-5' : 'btn-secondary mt-5'} onClick={() => { if (t.id === 'free') return nav(st.user ? '/app' : '/signin'); if (!st.user) { toast('Sign in first — your subscription attaches to your account, not your email.'); return nav('/signin') } setCheckout(t.id as any) }}>{st.data && st.data.sub.state === 'active' && st.data.sub.tier === t.id ? 'Current plan' : t.cta}</button>
    </Card>)}</div>
    <Card className="mt-10 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-ink-200 text-left"><th className="p-4">Capability</th><th className="p-4 text-center">Free</th><th className="p-4 text-center">Plus</th><th className="p-4 text-center">Max</th></tr></thead>
        <tbody>{MATRIX.map(r => <tr key={r[0]} className="border-b border-ink-100 last:border-0"><td className="p-4 text-ink-700">{r[0]}</td><td className="p-4 text-center">{cell(r[1])}</td><td className="p-4 text-center">{cell(r[2])}</td><td className="p-4 text-center">{cell(r[3])}</td></tr>)}</tbody></table>
    </Card>
    <div id="terms" className="mt-8 grid gap-4 text-sm text-ink-600 md:grid-cols-2">
      <Card className="p-5"><h3 className="mb-2 font-bold text-ink-900">Billing terms (proposed)</h3><ul className="list-disc space-y-1 pl-5"><li>Billed monthly to card or Apple Pay. Cancel anytime; access continues to the end of the paid month.</li><li>Pause billing any time (break mode) — history kept.</li><li>Failed payment: 7-day grace period with a visible banner, then Free. Learning data is retained.</li><li>Upgrades apply immediately with proration; downgrades at term end.</li><li>7-day no-questions refund on first purchase.</li></ul></Card>
      <Card className="p-5"><h3 className="mb-2 font-bold text-ink-900">AI cost contract (Max)</h3><p>"Unlimited features for a year" means feature access, not unlimited costly services. Max includes {POLICY.aiMonthlyBudget} AI help interactions per month. At the limit, you get reviewed static explanations — no surprise charges, no silent degradation. AI tutoring ships in MVP2 after quality gates.</p></Card>
    </div>
    <Modal open={!!checkout} onClose={() => !processing && setCheckout(null)} title="Checkout (simulated hosted checkout)">
      <p className="text-sm text-ink-600">{checkout === 'plus' ? 'Plus' : 'Max'} — ${checkout ? POLICY.prices[checkout] : 0}/month, {checkout ? POLICY.terms[checkout] : 0}-month term. {st.data?.sub.tier === 'plus' && checkout === 'max' ? 'Upgrade is prorated and applies immediately.' : ''}</p>
      <div className="mt-4 space-y-2"><button disabled={processing} className="btn w-full bg-black py-3 text-white hover:bg-ink-800" onClick={() => pay('apple_pay')}><Apple size={18} />Pay</button>
        <div className="grid grid-cols-2 gap-2"><input className="input col-span-2" defaultValue="4242 4242 4242 4242" aria-label="Card number" /><input className="input" defaultValue="12 / 29" aria-label="Expiry" /><input className="input" defaultValue="123" aria-label="CVC" /></div>
        <button disabled={processing} className="btn-primary w-full py-3" onClick={() => pay('card')}><CreditCard size={16} />{processing ? 'Waiting for payment confirmation…' : `Pay $${checkout ? POLICY.prices[checkout] : 0}`}</button></div>
      <p className="mt-3 text-xs text-ink-500">Demo only — no real payment is taken. Access is granted only after the (mock) signed webhook is processed, never from the redirect.</p>
    </Modal>
  </main>
}

export function Resources() {
  const res = [
    ['Bluebook™ app — full-length practice tests', 'College Board', 'https://bluebook.collegeboard.org/', 'Official adaptive digital SAT practice tests. Enter your results in the Data Zone afterward.'],
    ['SAT Practice and Preparation', 'College Board', 'https://satsuite.collegeboard.org/sat/practice-preparation', 'Official practice tests, question bank and test-day guidance.'],
    ['SAT Suite Question Bank', 'College Board', 'https://satsuitequestionbank.collegeboard.org/', 'Official item bank filterable by domain and skill.'],
    ['Official Digital SAT Prep', 'Khan Academy', 'https://www.khanacademy.org/test-prep/v2-sat-math', 'Free lessons and practice built with College Board.'],
    ['Understanding your scores', 'College Board', 'https://satsuite.collegeboard.org/scores/understanding-scores', 'What score ranges and Knowledge and Skills bands mean.'],
  ]
  return <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><div className="eyebrow">Free official-resource directory</div><h1 className="mt-2 text-3xl font-extrabold">Official practice is free. Use it.</h1><p className="mt-2 text-ink-600">We link to official resources and never copy or charge for them. Our paid value does not depend on a licensed archive.</p>
    <div className="mt-8 space-y-3">{res.map(([t, s, u, b]) => <a key={u} href={u} target="_blank" rel="noreferrer" className="card flex items-start gap-4 p-5 hover:border-indigo-300"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{t}</h3><Chip tone="sky">{s}</Chip></div><p className="mt-1 text-sm text-ink-600">{b}</p></div><ExternalLink size={18} className="mt-1 text-ink-400" /></a>)}</div>
    <p className="mt-6 text-xs text-ink-500">Bluebook and SAT are trademarks of the College Board. Links are provided for convenience; we are not affiliated.</p></main>
}

export function Policies() {
  const S = ({ id, t, children }: any) => <section id={id} className="card scroll-mt-24 p-6"><h2 className="mb-2 text-xl font-bold">{t}</h2><div className="space-y-2 text-sm text-ink-700">{children}</div></section>
  return <main className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6"><h1 className="text-3xl font-extrabold">Policies</h1>
    <S id="privacy" t="Privacy"><p>We collect your email (for sign-in), the goals and reports you enter, and your practice attempts. We do not store your date of birth — only that you confirmed you are 13 or older and the policy version shown.</p><p>We never log sign-in codes, student responses, notes or drafts. You can export everything you've entered or request deletion from Settings.</p><p>Users under 13 cannot register. If someone under 13 tries, no data is kept beyond an anonymous count.</p></S>
    <S id="billing" t="Billing terms"><p>Plus is ${POLICY.prices.plus}/month for a 6-month term; Max is ${POLICY.prices.max}/month for a 12-month term. Billed monthly; cancel anytime with access to the end of the paid month. Pause is available. Failed payments have a 7-day grace period, then the account moves to Free with all data kept. Upgrades are prorated; downgrades apply at term end. 7-day refund on first purchase (proposed).</p></S>
    <S id="recovery" t="Account recovery"><p>Your account is identified by an internal ID, not your email. To change email, sign in recently, verify the new address with a code, and we'll notify the old address.</p><p>Lost access to your old inbox? Contact support. Support verifies ownership using your payment receipt and recent session details, and a second staff member must approve. Support cannot silently bypass verification.</p></S>
    <S id="data" t="What this prototype stores"><p>This MVP1 prototype has no server: all data lives in your browser's localStorage. Clearing site data erases it.</p></S>
  </main>
}

// ---------------- Sign in: age gate → email → OTP ----------------
export function SignIn() {
  const nav = useNavigate(); const toast = useToast()
  const user = useDB(d => currentUser(d))
  const [step, setStep] = useState<'age' | 'blocked' | 'email' | 'code'>('age')
  const [year, setYear] = useState(''); const [confirm13, setConfirm13] = useState(false)
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const thisYear = new Date(now()).getFullYear()
  const y = Number(year), boundary = y === thisYear - 13
  if (user && step !== 'code') return <main className="mx-auto max-w-md px-4 py-16"><Card className="p-6 text-center"><h1 className="text-xl font-bold">You're signed in</h1><p className="mt-1 text-sm text-ink-600">{user.email}</p><Link to="/app" className="btn-primary mt-4 w-full">Go to Today</Link></Card></main>
  const age = () => {
    setErr('')
    if (!y || y < 1900 || y > thisYear) return setErr('Enter a valid year.')
    if (y > thisYear - 13 || (boundary && !confirm13)) {
      if (boundary && !confirm13) return setErr('Please confirm whether you are already 13.')
      update(d => { d.under13Count++ }); setStep('blocked'); return
    }
    setStep('email')
  }
  const send = async () => {
    setErr(''); if (!validEmail(email)) return setErr('Enter a valid email address.')
    setBusy(true); const r = await requestOtp(email); setBusy(false)
    if (!r.ok) return setErr(r.error!)
    setStep('code'); toast('Code sent — open the Demo inbox (bottom right) to see it.')
  }
  const verify = async () => {
    setErr(''); setBusy(true); const r = await verifyOtp(email, code); setBusy(false)
    if (!r.ok) return setErr(r.error!)
    nav(r.isNew ? '/app/onboarding' : '/app')
  }
  return <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
    <Card className="p-6 sm:p-8">
      {step === 'age' && <><div className="eyebrow">Step 1 of 2 · Eligibility</div><h1 className="mt-2 text-2xl font-extrabold">What year were you born?</h1><p className="mt-1 text-sm text-ink-600">We ask before collecting anything else. We store only whether you're eligible — not your birth year.</p>
        <label className="label mt-5" htmlFor="yr">Birth year</label><input id="yr" className="input" inputMode="numeric" placeholder="e.g. 2009" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        {boundary && <label className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" className="mt-1" checked={confirm13} onChange={e => setConfirm13(e.target.checked)} />I confirm I have already had my 13th birthday.</label>}
        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}<button className="btn-primary mt-5 w-full" onClick={age}>Continue</button></>}
      {step === 'blocked' && <><h1 className="text-2xl font-extrabold">Sorry — you need to be 13 or older</h1><p className="mt-2 text-sm text-ink-600">Improvement Plan isn't available for students under 13. We haven't saved any information about you. The free official resources are open to everyone.</p><Link to="/resources" className="btn-secondary mt-5 w-full">See free official resources</Link></>}
      {step === 'email' && <><div className="eyebrow">Step 2 of 2 · Sign in or sign up</div><h1 className="mt-2 text-2xl font-extrabold">Enter your email</h1><p className="mt-1 text-sm text-ink-600">We'll send a 6-digit code. No password needed.</p>
        <label className="label mt-5" htmlFor="em">Email</label><input id="em" type="email" autoComplete="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}<button disabled={busy} className="btn-primary mt-5 w-full" onClick={send}>Send code</button></>}
      {step === 'code' && <><h1 className="text-2xl font-extrabold">Check your email</h1><p className="mt-1 text-sm text-ink-600">If <b>{email}</b> can receive mail, a code is on its way. It expires in 10 minutes. <span className="text-indigo-700">(Demo: open the inbox at the bottom right.)</span></p>
        <label className="label mt-5" htmlFor="cd">6-digit code</label><input id="cd" inputMode="numeric" autoComplete="one-time-code" className="input text-center font-mono text-2xl tracking-[0.5em]" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()} />
        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}<button disabled={busy || code.length !== 6} className="btn-primary mt-5 w-full" onClick={verify}>Verify and continue</button>
        <button className="btn-ghost mt-2 w-full" onClick={send}>Resend code</button></>}
    </Card>
    {(step === 'age' || step === 'email') && <Card className="mt-4 flex flex-col items-center gap-2 p-4 text-center sm:flex-row sm:text-left"><div className="flex-1 text-sm"><b>Just looking?</b> <span className="text-ink-600">Explore with a sample learner who has two weeks of history.</span></div><button className="btn-secondary" onClick={() => { seedDemo(); nav('/app') }}>Open demo</button></Card>}
    <p className="mt-4 text-center text-xs text-ink-500">By continuing you agree to the <Link to="/policies" className="underline">policies</Link>. Max 5 code requests per hour; 5 tries per code.</p>
  </main>
}
