import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Anchor, Download, AlertTriangle } from 'lucide-react'
import { Card, Chip, Empty, Modal, PageHeader, download, fmtDate, useToast } from '../components/ui'
import { AssessmentType, Report, update, useMe, myData, uid, now, audit } from '../lib/store'
import { RANGES } from '../lib/policy'
import { anchorReport, rerank, validateReport } from '../lib/engine'
import { DOMAINS, BANDS } from '../data/taxonomy'

const blank = (): Partial<Report> => ({ type: 'sat', sourceLabel: '', testDate: '', total: null, rw: null, math: null, bands: {}, feedback: '', confirmed: false })

export default function DataZone() {
  const { user, data } = useMe(); const toast = useToast()
  const [sp, setSp] = useSearchParams()
  const [edit, setEdit] = useState<Partial<Report> | null>(sp.get('new') ? blank() : null)
  const [errs, setErrs] = useState<string[]>([])
  if (!data || !user) return null
  const anchor = anchorReport(data)
  const sorted = [...data.reports].sort((a, b) => b.testDate.localeCompare(a.testDate))
  const close = () => { setEdit(null); setErrs([]); if (sp.get('new')) setSp({}) }
  const save = () => {
    const e = validateReport(edit!)
    if (!edit!.confirmed) e.push('Please confirm the values match your report.')
    setErrs(e); if (e.length) return
    update(d => {
      const u = myData(d)!
      const prevAnchor = anchorReport(u)?.id
      if (edit!.id) { const r = u.reports.find(r => r.id === edit!.id)!; r.revisions.push({ at: now(), snapshot: JSON.stringify({ ...r, revisions: undefined }) }); Object.assign(r, edit) }
      else u.reports.push({ ...(edit as Report), id: uid(), enteredAt: now(), revisions: [] })
      audit(d, user.id, edit!.id ? 'report_edited' : 'report_added', edit!.type!)
      if (anchorReport(u)?.id !== prevAnchor || edit!.id === prevAnchor) rerank(d, u, 'New anchor report')
    })
    toast('Report saved'); close()
  }
  const del = (id: string) => { if (!confirm('Delete this report? Your practice history is not affected.')) return; update(d => { const u = myData(d)!; u.reports = u.reports.filter(r => r.id !== id); if (u.anchorOverride === id) u.anchorOverride = null; audit(d, user.id, 'report_deleted', id); rerank(d, u, 'Report deleted') }) }
  const setAnchor = (id: string | null) => update(d => { const u = myData(d)!; u.anchorOverride = id; rerank(d, u, 'New anchor report') })
  const rg = edit?.type ? RANGES[edit.type] : undefined
  const n = (v: string) => v === '' ? null : Number(v)
  const sumWarn = edit && edit.total != null && edit.rw != null && edit.math != null && edit.rw + edit.math !== edit.total
  return <>
    <PageHeader eyebrow="Data Collection Zone" title="Your score reports" sub="Enter results exactly as reported. Bands are kept as bands — we never convert them to percent correct." actions={<><button className="btn-secondary" onClick={() => download('score-reports.json', JSON.stringify(data.reports, null, 2))}><Download size={16} />Export</button><button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={16} />Add report</button></>} />
    {sorted.length === 0 ? <Empty title="No reports yet" body="Add an official SAT/PSAT report or a Bluebook practice result. No report? The starter diagnostic gives you a baseline instead." action={<button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={16} />Add a report</button>} /> :
      <div className="space-y-3">
        <Card className="flex items-start gap-3 bg-indigo-50/60 p-4 text-sm"><Anchor size={18} className="mt-0.5 text-indigo-600" /><div>Anchor report: <b>{anchor && `${RANGES[anchor.type].label} · ${anchor.testDate}`}</b>. {data.anchorOverride ? <>You chose this anchor. <button className="font-semibold text-indigo-700 underline" onClick={() => setAnchor(null)}>Use latest test date instead</button></> : 'Chosen automatically: the latest test date (not the most recently entered).'}</div></Card>
        {sorted.map(r => { const range = RANGES[r.type]; const isA = anchor?.id === r.id; return <Card key={r.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{r.type === 'other' ? r.sourceLabel : range.label}</h3>{isA && <Chip tone="indigo">Anchor</Chip>}<Chip tone={range.official ? 'sky' : 'gray'}>{range.official ? 'Official' : 'Practice'}</Chip></div><div className="mt-1 text-xs text-ink-500">Test date {r.testDate} · entered {fmtDate(r.enteredAt)}{r.revisions.length > 0 && ` · ${r.revisions.length} revision(s)`}</div></div>
            <div className="flex gap-1">{!isA && <button className="btn-ghost px-2 text-xs" onClick={() => setAnchor(r.id)}><Anchor size={14} />Set anchor</button>}<button className="btn-ghost px-2" aria-label="Edit" onClick={() => setEdit({ ...r })}><Pencil size={15} /></button><button className="btn-ghost px-2 text-rose-600" aria-label="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">{[['Total', r.total], ['Reading & Writing', r.rw], ['Math', r.math]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-ink-50 p-3"><div className="font-head text-xl font-extrabold sm:text-2xl">{v ?? <span className="text-ink-400">—</span>}</div><div className="text-[11px] text-ink-500 sm:text-xs">{l}</div></div>)}</div>
          {r.type === 'psat_10' || r.type === 'psat_nmsqt' || r.type === 'psat_8_9' ? <p className="mt-2 text-xs text-ink-500">{range.label} scores are on a different scale and are not treated as SAT scores.</p> : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{DOMAINS.map(dm => <div key={dm.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm"><span className="text-ink-700">{dm.name}</span>{r.bands[dm.id] != null ? <span className="font-semibold">Band {r.bands[dm.id]}/7</span> : <Chip tone="amber">Unknown</Chip>}</div>)}</div>
          {r.feedback && <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm"><div className="text-xs font-semibold text-ink-500">You pasted this from your report (not independently verified)</div><p className="mt-1 whitespace-pre-wrap">{r.feedback}</p></div>}
        </Card> })}
      </div>}
    <Modal open={!!edit} onClose={close} title={edit?.id ? 'Edit report' : 'Add a score report'} wide>
      {edit && <div className="space-y-4">
        <div><label className="label">Assessment type</label><select className="input" value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value as AssessmentType })}>{Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>{rg && edit.type !== 'other' && <p className="mt-1 text-xs text-ink-500">Total {rg.total[0]}–{rg.total[1]} · sections {rg.section[0]}–{rg.section[1]}</p>}</div>
        {edit.type === 'other' && <div><label className="label">Source (required)</label><input className="input" placeholder='e.g. "Princeton Review practice test 2"' value={edit.sourceLabel} onChange={e => setEdit({ ...edit, sourceLabel: e.target.value })} /><p className="mt-1 text-xs text-ink-500">For other formats we don't force an SAT-equivalent total — scores are optional.</p></div>}
        <div><label className="label">Test date</label><input type="date" className="input" value={edit.testDate} onChange={e => setEdit({ ...edit, testDate: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-2"><div><label className="label text-xs sm:text-sm">Total</label><input className="input" inputMode="numeric" value={edit.total ?? ''} onChange={e => setEdit({ ...edit, total: n(e.target.value.replace(/\D/g, '')) })} /></div><div><label className="label text-xs sm:text-sm">R&W</label><input className="input" inputMode="numeric" value={edit.rw ?? ''} onChange={e => setEdit({ ...edit, rw: n(e.target.value.replace(/\D/g, '')) })} /></div><div><label className="label text-xs sm:text-sm">Math</label><input className="input" inputMode="numeric" value={edit.math ?? ''} onChange={e => setEdit({ ...edit, math: n(e.target.value.replace(/\D/g, '')) })} /></div></div>
        {sumWarn && <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800"><AlertTriangle size={15} />Your sections add to {edit.rw! + edit.math!} but your total is {edit.total} — please check.</p>}
        <div><label className="label">Knowledge & Skills performance bands <span className="font-normal text-ink-500">(leave unknown if not on your report)</span></label><div className="grid gap-2 sm:grid-cols-2">{DOMAINS.map(dm => <div key={dm.id}><div className="mb-0.5 text-xs text-ink-600">{dm.name}</div><select className="input py-2" value={edit.bands?.[dm.id] ?? ''} onChange={e => setEdit({ ...edit, bands: { ...edit.bands, [dm.id]: e.target.value === '' ? null : Number(e.target.value) } })}><option value="">Unknown</option>{BANDS.map((b, i) => <option key={i} value={i + 1}>Band {b}</option>)}</select></div>)}</div></div>
        <div><label className="label">Report feedback text <span className="font-normal text-ink-500">(optional — paste from your report)</span></label><textarea className="input min-h-[80px]" value={edit.feedback} onChange={e => setEdit({ ...edit, feedback: e.target.value })} /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!edit.confirmed} onChange={e => setEdit({ ...edit, confirmed: e.target.checked })} />I confirm these values match my report.</label>
        {errs.length > 0 && <ul className="space-y-1 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{errs.map(e => <li key={e}>• {e}</li>)}</ul>}
        <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" onClick={save}>Save report</button></div>
      </div>}
    </Modal>
  </>
}
