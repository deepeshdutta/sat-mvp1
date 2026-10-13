import { Mode, update, myData, getDB } from './store'
import { buildSession, freeCapReached } from './engine'

/** Start a session. Returns session id, or {paywall} when the Free daily cap applies (diagnostics & review exempt). */
export function startSession(mode: Mode, opts: { topic?: string; budgetSec?: number } = {}): { id?: string; paywall?: boolean; error?: string } {
  const u = myData(getDB())!
  if ((mode === 'weakness' || mode === 'topic') && freeCapReached(u)) return { paywall: true }
  const active = u.sessions.find(s => s.state !== 'completed' && s.mode === mode && s.topicRef === opts.topic)
  if (active) return { id: active.id } // resume instead of duplicating
  const s = buildSession(getDB(), u, mode, opts)
  if (typeof s === 'string') return { error: s }
  update(d => { myData(d)!.sessions.push(s) })
  return { id: s.id }
}
