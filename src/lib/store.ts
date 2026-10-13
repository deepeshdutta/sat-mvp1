// Mock "backend": a localStorage-persisted database with the same entities as the technical spec (§3).
import { useSyncExternalStore } from 'react'

export type Tier = 'free' | 'plus' | 'max'
export type AssessmentType = 'sat' | 'psat_nmsqt' | 'psat_10' | 'psat_8_9' | 'bluebook' | 'other'
export type Mode = 'diagnostic_starter' | 'diagnostic_focused' | 'weakness' | 'topic' | 'review' | 'delayed_check'
export type MistakeCategory = 'concept' | 'misread' | 'calculation' | 'time' | 'guessed' | 'not_sure'

export interface User { id: string; email: string; createdAt: number; eligibility: { status: 'eligible'; policyVersion: string }; timezone: string; role?: 'student' }
export interface AuthSession { id: string; userId: string; tokenHash: string; createdAt: number; expiresAt: number; revokedAt?: number; device: string; recentAuthAt: number }
export interface Challenge { id: string; email: string; codeHmac: string; expiresAt: number; attempts: number; consumedAt?: number; createdAt: number; purpose: 'signin' | 'email_change' | 'admin_mfa' }
export interface MailMsg { id: string; to: string; subject: string; body: string; at: number }
export interface Goals { targetTotal: number | null; targetRW: number | null; targetMath: number | null; testDate: string | null; weeklyWorkouts: number; availability: string[]; sectionPreference: 'balanced' | 'RW' | 'M'; version: number }
export interface Report { id: string; type: AssessmentType; sourceLabel: string; testDate: string; enteredAt: number; total: number | null; rw: number | null; math: number | null; bands: Record<string, number | null>; feedback: string; confirmed: boolean; revisions: { at: number; snapshot: string }[] }
export interface SessionItem { qid: string; version: number; position: number; state: 'queued' | 'presented' | 'answered' | 'unattempted'; presentedAt?: number; bucket?: 'primary' | 'next' | 'review' | 'topic' | 'diagnostic' }
export interface Session { id: string; mode: Mode; topicRef?: string; budgetSec: number; startedAt: number; endsAt: number; pausedAt?: number; pauseUsed: boolean; state: 'active' | 'paused' | 'completed'; items: SessionItem[]; ladder: Record<string, number>; ladderLog: { at: number; skill: string; from: number; to: number; reason: string }[]; notes: string[]; policyVersion: string; completedAt?: number; blockFeedbackReleased?: boolean; planBefore?: string; planAfter?: string; explanationMs: number; blockBreakSeen?: boolean }
export interface Attempt { id: string; sessionId: string; mode: Mode; qid: string; version: number; skill: string; domain: string; difficulty: number; response: string; correct: boolean; firstExposure: boolean; assistance: number; answerMs: number; explanationMs: number; idempotencyKey: string; answeredAt: number; invalidatedAt?: number }
export interface MistakeEntry { id: string; attemptId: string; qid: string; skill: string; response: string; createdAt: number; category: MistakeCategory | null; note: string; state: 'open' | 'reviewed'; reviewDue: number; reviewDone?: number; reviewResult?: 'success' | 'miss' }
export interface DelayedCheck { id: string; skill: string; dueAt: number; state: 'scheduled' | 'done'; result?: { correct: number; total: number } }
export interface PlanCard { key: string; skill?: string; domain: string; priority: 'high' | 'medium' | 'low'; evidence: 'observed' | 'provisional' | 'reported' | 'secured'; reason: string; evidenceRef: string; nextAction: string; reassess: string; score: number }
export interface Plan { id: string; createdAt: number; trigger: string; policyVersion: string; anchorReportId: string | null; cards: PlanCard[] }
export interface Invoice { id: string; at: number; amount: number; desc: string; status: 'paid' | 'failed' | 'refunded' }
export interface Subscription { tier: Tier; state: 'none' | 'active' | 'past_due' | 'paused' | 'canceled'; termStart?: number; termEnd?: number; periodEnd?: number; cancelAtPeriodEnd?: boolean; graceUntil?: number; firstPurchaseAt?: number; refunds: number }
export interface Prefs { reminderOptIn: boolean; reminderTime: string; quietStart: string; quietEnd: string; weeklyEmail: boolean; lastReminderDate?: string }
export interface UserData { onboarded: boolean; goals: Goals; reports: Report[]; anchorOverride: string | null; sessions: Session[]; attempts: Attempt[]; notebook: MistakeEntry[]; delayedChecks: DelayedCheck[]; plans: Plan[]; sub: Subscription; invoices: Invoice[]; prefs: Prefs; badges: { id: string; at: number }[]; notices: { id: string; at: number; text: string; read?: boolean }[] }
export interface Flag { id: string; qid: string; reporter: string; reason: string; severity: 'critical' | 'minor'; state: 'open' | 'quarantined' | 'resolved'; at: number; note?: string }
export interface WebhookEvent { id: string; type: string; userId: string; payload: any; receivedAt: number; processedAt?: number; duplicateDeliveries: number }
export interface Audit { at: number; actor: string; action: string; object: string }
export interface DB {
  v: number; users: User[]; authSessions: AuthSession[]; token: string | null; challenges: Challenge[]; mail: MailMsg[]; rate: Record<string, number[]>
  data: Record<string, UserData>; flags: Flag[]; qStatus: Record<string, 'published' | 'quarantined' | 'in_review' | 'retired'>; webhooks: WebhookEvent[]; audit: Audit[]; under13Count: number; admin: { mfaAt?: number }; analytics: { ev: string; at: number }[]
  clockOffsetMs: number // demo "time travel" so 3–7 day reviews can be shown
}

const KEY = 'sat-mvp1-db'
const fresh = (): DB => ({ v: 1, users: [], authSessions: [], token: null, challenges: [], mail: [], rate: {}, data: {}, flags: [], qStatus: {}, webhooks: [], audit: [], under13Count: 0, admin: {}, analytics: [], clockOffsetMs: 0 })

let db: DB = (() => { try { const s = localStorage.getItem(KEY); if (s) return { ...fresh(), ...JSON.parse(s) } } catch { /* ignore */ } return fresh() })()
const subs = new Set<() => void>()
let version = 0

export const getDB = () => db
export function update(fn: (d: DB) => void) {
  const next: DB = structuredClone(db); fn(next); db = next; version++
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* quota */ }
  subs.forEach(f => f())
}
export function resetDB() { db = fresh(); localStorage.removeItem(KEY); version++; subs.forEach(f => f()) }
export function useDB<T>(sel: (d: DB) => T): T {
  useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => version)
  return sel(db)
}
window.addEventListener('storage', e => { if (e.key === KEY && e.newValue) { db = JSON.parse(e.newValue); version++; subs.forEach(f => f()) } })

export const now = () => Date.now() + (db?.clockOffsetMs ?? 0)
export const DAY = 86_400_000
export const uid = () => crypto.randomUUID()
export const todayKey = (t = now()) => new Date(t).toISOString().slice(0, 10)

export function audit(d: DB, actor: string, action: string, object: string) { d.audit.unshift({ at: now(), actor, action, object }); d.audit = d.audit.slice(0, 500) }
export function track(d: DB, ev: string) { d.analytics.push({ ev, at: now() }); d.analytics = d.analytics.slice(-2000) }

export const defaultUserData = (): UserData => ({
  onboarded: false,
  goals: { targetTotal: null, targetRW: null, targetMath: null, testDate: null, weeklyWorkouts: 3, availability: ['Mon', 'Wed', 'Sat'], sectionPreference: 'balanced', version: 1 },
  reports: [], anchorOverride: null, sessions: [], attempts: [], notebook: [], delayedChecks: [], plans: [],
  sub: { tier: 'free', state: 'none', refunds: 0 }, invoices: [],
  prefs: { reminderOptIn: false, reminderTime: '17:00', quietStart: '21:30', quietEnd: '07:00', weeklyEmail: false },
  badges: [], notices: [],
})

// ---- crypto helpers (simulating server-side keyed verification, §6.1) ----
const SERVER_KEY = 'mock-server-secret-not-in-db' // in production lives in a secrets manager
export async function hmac(msg: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(SERVER_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}
export function sixDigit() { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0] % 1_000_000).padStart(6, '0') }

// ---- current user helpers ----
export function currentSession(d: DB = db): AuthSession | undefined {
  if (!d.token) return
  const s = d.authSessions.find(s => s.tokenHash === d.token)
  if (!s || s.revokedAt || s.expiresAt < now()) return
  return s
}
export function currentUser(d: DB = db): User | undefined { const s = currentSession(d); return s ? d.users.find(u => u.id === s.userId) : undefined }
/** Authorization: user-scoped data is always read via the session's user id, never a URL param (IDOR guard). */
export function myData(d: DB = db): UserData | undefined { const u = currentUser(d); return u ? d.data[u.id] : undefined }
export function useMe() { return useDB(d => ({ user: currentUser(d), data: myData(d) })) }
