import { POLICY } from './policy'
import { DB, DAY, audit, defaultUserData, getDB, hmac, now, sixDigit, track, uid, update, currentSession, currentUser } from './store'

const norm = (e: string) => e.trim().toLowerCase()
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

/** Request a 6-digit OTP. Response is identical whether or not the account exists (anti-enumeration). */
export async function requestOtp(emailRaw: string, purpose: 'signin' | 'email_change' | 'admin_mfa' = 'signin'): Promise<{ ok: boolean; error?: string }> {
  const email = norm(emailRaw)
  const key = `otp:${email}`, t = now()
  const recent = (getDB().rate[key] ?? []).filter(x => t - x < 3600_000)
  if (recent.length >= POLICY.otp.maxPerHour) return { ok: false, error: 'Too many code requests. Please wait before requesting another code.' }
  const code = sixDigit(), id = uid()
  const codeHmac = await hmac(`${email}|${code}|${id}`)
  update(d => {
    d.rate[key] = [...recent, t]
    d.challenges = d.challenges.filter(c => t - c.createdAt < DAY)
    d.challenges.push({ id, email, codeHmac, expiresAt: t + POLICY.otp.ttlMin * 60_000, attempts: 0, createdAt: t, purpose })
    // Mock email provider: the code is "delivered" to the demo inbox, never logged elsewhere.
    d.mail.unshift({ id: uid(), to: email, subject: purpose === 'admin_mfa' ? 'Admin MFA code' : 'Your sign-in code', body: `Your code is ${code}. It expires in ${POLICY.otp.ttlMin} minutes and can be used once.`, at: t })
    d.mail = d.mail.slice(0, 30)
    track(d, 'otp_requested')
  })
  return { ok: true }
}

export async function verifyOtp(emailRaw: string, code: string, purpose: 'signin' | 'email_change' | 'admin_mfa' = 'signin'): Promise<{ ok: boolean; error?: string; userId?: string; isNew?: boolean }> {
  const email = norm(emailRaw), t = now()
  const ch = [...getDB().challenges].reverse().find(c => c.email === email && c.purpose === purpose)
  const generic = 'That code is invalid or expired. Request a new one.'
  if (!ch) return { ok: false, error: generic }
  if (ch.consumedAt) return { ok: false, error: 'This code was already used. Request a new one.' }
  if (ch.expiresAt < t) return { ok: false, error: 'This code has expired (10-minute limit). Request a new one.' }
  if (ch.attempts >= POLICY.otp.maxAttempts) return { ok: false, error: 'Too many attempts for this code. Request a new one.' }
  const good = (await hmac(`${email}|${code.trim()}|${ch.id}`)) === ch.codeHmac
  let result: { ok: boolean; error?: string; userId?: string; isNew?: boolean } = { ok: false }
  update(d => {
    const c = d.challenges.find(x => x.id === ch.id)!
    if (!good) { c.attempts++; result = { ok: false, error: c.attempts >= POLICY.otp.maxAttempts ? 'Too many attempts for this code. Request a new one.' : `Incorrect code. ${POLICY.otp.maxAttempts - c.attempts} attempt(s) left.` }; return }
    c.consumedAt = t
    if (purpose !== 'signin') { result = { ok: true }; return }
    let user = d.users.find(u => u.email === email), isNew = false
    if (!user) {
      user = { id: uid(), email, createdAt: t, eligibility: { status: 'eligible', policyVersion: 'age-gate-v1' }, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
      d.users.push(user); d.data[user.id] = defaultUserData(); isNew = true
      audit(d, user.id, 'account_created', user.id)
    }
    const token = uid() + uid()
    d.authSessions.push({ id: uid(), userId: user.id, tokenHash: token, createdAt: t, expiresAt: t + POLICY.authSessionDays * DAY, device: navigator.userAgent.includes('Mobile') ? 'Mobile browser' : 'Desktop browser', recentAuthAt: t })
    d.token = token
    audit(d, user.id, 'signin', user.id); track(d, 'signin')
    result = { ok: true, userId: user.id, isNew }
  })
  return result
}

export function logout() { update(d => { const s = currentSession(d); if (s) { s.revokedAt = now(); audit(d, s.userId, 'logout', s.id) } d.token = null }) }
export function revokeSession(id: string) { update(d => { const u = currentUser(d); const s = d.authSessions.find(x => x.id === id && x.userId === u?.id); if (s) { s.revokedAt = now(); audit(d, u!.id, 'session_revoked', id) } }) }
export function logoutAll() { update(d => { const u = currentUser(d); if (!u) return; d.authSessions.filter(s => s.userId === u.id).forEach(s => s.revokedAt = now()); audit(d, u.id, 'logout_all', u.id); d.token = null }) }
export const recentAuthOk = (d: DB = getDB()) => { const s = currentSession(d); return !!s && now() - s.recentAuthAt < POLICY.recentAuthMin * 60_000 }
export function bumpRecentAuth() { update(d => { const s = currentSession(d); if (s) s.recentAuthAt = now() }) }

/** Email change: requires recent auth + verification of new email; old email notified; user_id unchanged so entitlements/history persist. */
export function completeEmailChange(newEmailRaw: string) {
  const newEmail = norm(newEmailRaw)
  update(d => {
    const u = currentUser(d); if (!u) return
    const old = u.email
    u.email = newEmail
    d.mail.unshift({ id: uid(), to: old, subject: 'Security notice: your email was changed', body: `The sign-in email for your account was changed to ${newEmail}. If this wasn't you, contact support — recovery requires verification and cannot be bypassed.`, at: now() })
    audit(d, u.id, 'email_changed', `${old} → ${newEmail}`)
  })
}
export function emailTaken(e: string) { return getDB().users.some(u => u.email === norm(e)) }
