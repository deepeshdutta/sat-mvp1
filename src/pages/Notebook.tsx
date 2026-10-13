import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Download, Check, Clock, Flag, Lightbulb, Trash2 } from 'lucide-react'
import { Card, Chip, Empty, PageHeader, download, fmtDate, useToast, cx } from '../components/ui'
import { MistakeCategory, update, useMe, myData, now, DAY } from '../lib/store'
import { qById, servable } from '../lib/engine'
import { startSession } from '../lib/actions'
import { skillById } from '../data/taxonomy'
import { getDB } from '../lib/store'
import { ReportModal } from './Session'

export const CATS: [MistakeCategory, string][] = [['concept', 'Did not know concept'], ['misread', 'Misunderstood question'], ['calculation', 'Calculation/reading error'], ['time', 'Ran out of time'], ['guessed', 'Guessed'], ['not_sure', 'Not sure']]
const L = ['A', 'B', 'C', 'D']
export default function Notebook() {
  const { data } = useMe(); const nav = useNavigate(); const toast = useToast()
  const [filter, setFilter] = useState<'open' | 'reviewed' | 'all'>('open')
  const [open, setOpen] = useState<string | null>(null)
  const [extra, setExtra] = useState<Record<string, string>>({})
  const [flagQ, setFlagQ] = useState<string | null>(null)
  if (!data) return null
  const list = data.notebook.filter(m => filter === 'all' || m.state === filter)
  const due = data.notebook.filter(m => m.state === 'open' && m.reviewDue <= now()).length
  const set = (id: string, fn: (m: any) => void) => update(d => { const m = myData(d)!.notebook.find(x => x.id === id); if (m) fn(m) })
  const exportCSV = () => { const rows = [['date', 'skill', 'question_id', 'your_answer', 'category', 'note', 'state', 'review_due'], ...data.notebook.map(m => [fmtDate(m.createdAt), skillById(m.skill).name, m.qid, m.response, m.category ?? '', m.note.replace(/"/g, '""'), m.state, fmtDate(m.reviewDue)])]; download('mistake-notebook.csv', rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n'), 'text/csv') }
  return <>
    <PageHeader eyebrow="Mistake notebook" title="Learn from every miss" sub="Incorrect practice answers land here automatically, once per attempt. Classify them if you like — we never guess why you missed something." actions={<><button className="btn-secondary" onClick={exportCSV}><Download size={16} />Export CSV</button>{due > 0 && <button className="btn-primary" onClick={() => { const r = startSession('review'); if (r.error) return toast(r.error); nav('/app/session/' + r.id) }}><Clock size={16} />Review {due} due</button>}</>} />
    <div className="mb-4 flex gap-1 rounded-xl border border-ink-200 bg-white p-1 sm:w-fit">{(['open', 'reviewed', 'all'] as const).map(f => <button key={f} onClick={() => setFilter(f)} className={cx('flex-1 rounded-lg px-4 py-1.5 text-sm font-semibold capitalize sm:flex-none', filter === f ? 'bg-indigo-600 text-white' : 'text-ink-600')}>{f} ({data.notebook.filter(m => f === 'all' || m.state === f).length})</button>)}</div>
    {list.length === 0 ? <Empty icon={<BookOpen size={32} />} title={filter === 'open' ? 'No open mistakes' : 'Nothing here yet'} body="When you miss a practice question, it appears here with the explanation and a check-back 3–7 days later." /> :
      <div className="space-y-3">{list.map(m => { const q = qById(m.qid); const isOpen = open === m.id; const ri = q.type === 'mcq' ? Number(m.response) : -1
        return <Card key={m.id} className="p-4 sm:p-5">
          <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen(isOpen ? null : m.id)}>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Chip tone="indigo">{skillById(m.skill).name}</Chip>{m.category && <Chip tone="gray">{CATS.find(c => c[0] === m.category)?.[1]}</Chip>}{m.state === 'reviewed' ? <Chip tone="green">Reviewed</Chip> : m.reviewDue <= now() ? <Chip tone="amber">Check-back due</Chip> : <Chip tone="gray">Check-back {fmtDate(m.reviewDue)}</Chip>}</div><p className="mt-2 line-clamp-2 text-sm text-ink-800">{q.stem}</p><div className="mt-1 text-xs text-ink-500">{fmtDate(m.createdAt)} · your answer: {ri >= 0 ? `${L[ri]}. ${q.choices![ri]}` : m.response}</div></div>
          </button>
          {isOpen && <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
            {q.passage && <div className="rounded-lg bg-ink-50 p-3 text-sm">{q.passage}</div>}
            <div className="text-sm"><b>Correct answer:</b> {q.type === 'mcq' ? `${L[q.answer as number]}. ${q.choices![q.answer as number]}` : (q.answer as string[]).join(' or ')}</div>
            {ri >= 0 && q.distractors?.[ri] && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900"><b>Why your answer is wrong:</b> {q.distractors[ri]}</div>}
            <div className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900"><b>Reviewed explanation:</b> {q.explanation}</div>
            {extra[m.id] && <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">{extra[m.id]}</div>}
            <div><div className="label">What happened? <span className="font-normal text-ink-500">(optional)</span></div><div className="flex flex-wrap gap-1.5">{CATS.map(([k, l]) => <button key={k} onClick={() => set(m.id, x => x.category = x.category === k ? null : k)} className={cx('rounded-full border px-3 py-1 text-xs font-semibold', m.category === k ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-ink-200 text-ink-700')}>{l}</button>)}</div>
              {m.category === 'guessed' && <p className="mt-2 text-xs text-indigo-700">Next: a short concept refresher and an unseen question. Answering this same question again counts as review success, not new mastery.</p>}</div>
            <div><label className="label" htmlFor={'n' + m.id}>Private note</label><div className="flex gap-2"><textarea id={'n' + m.id} className="input min-h-[60px]" value={m.note} onChange={e => set(m.id, x => x.note = e.target.value)} placeholder="Only you can see this." />{m.note && <button className="btn-ghost px-2 text-rose-600" aria-label="Delete note" onClick={() => set(m.id, x => x.note = '')}><Trash2 size={16} /></button>}</div></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setExtra({ ...extra, [m.id]: `Explained differently — the rule: ${q.hints[1]} Watch for this trap: ${q.trap}` })}><Lightbulb size={13} />Explain differently</button>
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => { const s = servable(getDB()).filter(x => x.skill === m.skill && x.difficulty === 1)[0]; setExtra({ ...extra, [m.id]: s ? `Simpler example: ${s.stem} — ${s.explanation}` : 'No simpler example is available for this skill yet.' }) }}>Simpler example</button>
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => { const r = startSession('topic', { topic: m.skill, budgetSec: 600 }); if (r.paywall) return toast('Free daily workout used — the scheduled review is still free.'); if (r.error) return toast(r.error); nav('/app/session/' + r.id) }}>New similar question</button>
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => { set(m.id, x => x.reviewDue = now() + 3 * DAY); toast('We\'ll check back in 3 days.') }}><Clock size={13} />Check later</button>
              {m.state === 'open' ? <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => set(m.id, x => { x.state = 'reviewed'; x.reviewDone = now() })}><Check size={13} />Mark reviewed</button> : <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => set(m.id, x => { x.state = 'open' })}>Reopen</button>}
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setFlagQ(m.qid)}><Flag size={13} />Report content problem</button>
            </div>
          </div>}
        </Card> })}</div>}
    <ReportModal open={!!flagQ} onClose={() => setFlagQ(null)} qid={flagQ ?? ''} />
  </>
}
