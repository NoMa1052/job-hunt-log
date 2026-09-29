import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { formatShortDate } from '../../lib/format'
import { useData } from '../../state/DataProvider'
import { useProfile } from '../../state/ProfileProvider'
import { useUser } from '../../state/UserContext'
import MobileActions from '../../components/MobileActions'
import PageHeader from '../../components/PageHeader'
import { Badge, Button, Card, ConfirmDialog, IconButton } from '../../ui'
import { errorMessage, listResumes, resumeAi, useResumesAvailable } from './api'
import { emptyResume, fileExtension, normalizeResume, titleFromFileName } from './schema'
import ResumeEditor from './ResumeEditor'
import ResumeInsights from './ResumeInsights'
import './resumes.css'

const MAX_BYTES = 5 * 1024 * 1024
const USAGE_LABELS = { parse: 'imports', improve: 'AI edits', match: 'match scores', tailor: 'tailored resumes', cover_letter: 'cover letters', insights: 'insights' }

export default function ResumesPage() {
  const available = useResumesAvailable()
  const { resumeId } = useParams()

  if (available === null) return <div className="empty-state">Loading…</div>
  if (!available) {
    return (
      <section aria-label="Resumes">
        <PageHeader title="Resumes" />
        <div className="empty-state">Resumes aren't available yet.</div>
      </section>
    )
  }
  return resumeId ? <ResumeEditor key={resumeId} resumeId={resumeId} /> : <ResumeList />
}

function ResumeList() {
  const navigate = useNavigate()
  const user = useUser()
  const { data } = useData()
  const { profile } = useProfile()
  const [resumes, setResumes] = useState([])
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [usage, setUsage] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    try {
      setResumes(await listResumes())
      setStatus('ready')
    } catch (e) {
      setError(errorMessage(e))
      setStatus('error')
    }
  }, [])
  const loadUsage = useCallback(() => { resumeAi('usage').then(setUsage).catch(() => setUsage(null)) }, [])

  useEffect(() => { load(); loadUsage() }, [load, loadUsage])

  const open = id => navigate(`/app/resumes/${id}`)
  const base = resumes.filter(r => !r.application_id)
  const tailored = resumes.filter(r => r.application_id)
  const appLabel = id => {
    const a = data.applications.rows.find(x => x.id === id)
    return a ? [a.position, a.company].filter(Boolean).join(' at ') || 'Untitled application' : null
  }

  async function insert(fields) {
    const { data: row, error: e } = await supabase.from('resumes')
      .insert({ ...fields, is_default: base.length === 0 })
      .select('id').single()
    if (e) throw e
    return row.id
  }

  async function createBlank() {
    setError('')
    const content = emptyResume()
    content.contact.name = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    content.contact.email = user?.email || ''
    content.contact.location = profile.location || ''
    try { open(await insert({ title: 'New resume', target_role: profile.target_roles?.[0]?.slice(0, 100) || '', content })) }
    catch (e) { setError(errorMessage(e)) }
  }

  async function importFile(file) {
    if (!file) return
    setError('')
    const ext = fileExtension(file.name)
    if (ext !== 'pdf' && ext !== 'docx') return setError('Upload a PDF or Word (.docx) file.')
    if (file.size > MAX_BYTES) return setError('That file is over 5 MB. Try a smaller export.')
    setBusy('Reading your resume…')
    try {
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('resumes').upload(path, file, { contentType: file.type || undefined })
      if (upErr) throw upErr
      let parsed
      if (ext === 'pdf') {
        parsed = await resumeAi('parse', { file_path: path })
      } else {
        const mammoth = await import('mammoth')
        const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
        if (!value.trim()) throw new Error("That Word file doesn't have any text we can read.")
        parsed = await resumeAi('parse', { text: value })
      }
      setBusy('Saving…')
      const id = await insert({ title: titleFromFileName(file.name), content: normalizeResume(parsed.content), source_file_path: path })
      open(id)
    } catch (e) {
      setError(errorMessage(e))
      loadUsage()
    } finally {
      setBusy('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function makeDefault(id) {
    setError('')
    // Clear the old default first: only one default is allowed per user.
    const { error: e1 } = await supabase.from('resumes').update({ is_default: false }).eq('is_default', true)
    const { error: e2 } = e1 ? {} : await supabase.from('resumes').update({ is_default: true }).eq('id', id)
    if (e1 || e2) setError(errorMessage(e1 || e2))
    load()
  }

  async function duplicate(id) {
    setError('')
    const { data: row, error: e } = await supabase.from('resumes').select('title, target_role, content').eq('id', id).single()
    if (e) return setError(errorMessage(e))
    try { await insert({ ...row, title: `${row.title} copy`.slice(0, 100) }); load() }
    catch (err) { setError(errorMessage(err)) }
  }

  async function remove(r) {
    setConfirming(null); setError('')
    const { data: row } = await supabase.from('resumes').select('source_file_path').eq('id', r.id).single()
    const { error: e } = await supabase.from('resumes').delete().eq('id', r.id)
    if (e) return setError(errorMessage(e))
    if (row?.source_file_path) await supabase.storage.from('resumes').remove([row.source_file_path])
    load()
  }

  const shownUsage = usage && Object.entries(usage.usage).filter(([, v]) => v.limit > 0)

  return (
    <section aria-label="Resumes" className="rs-page">
      <PageHeader
        title="Resumes"
        actions={<>
          <Button icon="download" onClick={() => fileRef.current?.click()} disabled={!!busy}>Import resume</Button>
          <Button variant="primary" icon="plus" onClick={createBlank} disabled={!!busy}>New resume</Button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={e => importFile(e.target.files?.[0])} />
        </>}
        mobileActions={
          <MobileActions
            primary={<Button variant="primary" icon="plus" onClick={createBlank} disabled={!!busy}>New resume</Button>}
            items={[{ label: 'Import resume', onSelect: () => fileRef.current?.click() }]}
          />
        }
      />

      {shownUsage && (
        <p className="views-note">
          {usage.plan === 'pro' ? 'Pro' : 'Free plan'} this month: {shownUsage.map(([k, v]) => `${v.used} of ${v.limit} ${USAGE_LABELS[k]}`).join(', ')}.
        </p>
      )}
      {busy && <p className="rs-status" role="status">{busy}</p>}
      {error && <p className="rs-error" role="alert">{error}</p>}

      {status === 'loading' ? <div className="empty-state">Loading…</div>
        : status === 'error' && resumes.length === 0 ? <div className="empty-state error-state">Couldn't load your resumes. <Button variant="link" onClick={load}>Try again</Button></div>
        : base.length === 0 ? (
          <Card className="rs-empty">
            <h2 className="rs-card-title">Add your first resume</h2>
            <p className="rs-card-desc">Import the resume you already have and it's split into sections you can edit, improve with AI and tailor to each job. Or start from scratch.</p>
            <div className="rs-actions">
              <Button icon="download" onClick={() => fileRef.current?.click()} disabled={!!busy}>Import PDF or Word</Button>
              <Button variant="ghost" onClick={createBlank} disabled={!!busy}>Start from scratch</Button>
            </div>
          </Card>
        ) : (
          <>
            <ResumeRows rows={base} onOpen={open} onDelete={setConfirming} extra={r => (
              <>
                {r.is_default ? <Badge tone="indigo">Default</Badge> : <Button variant="ghost" size="sm" onClick={() => makeDefault(r.id)}>Make default</Button>}
                <Button variant="ghost" size="sm" onClick={() => duplicate(r.id)}>Duplicate</Button>
              </>
            )} meta={r => `${r.target_role || 'No target role'}, edited ${formatShortDate(r.updated_at.slice(0, 10), new Date(), profile.date_format)}`} />

            {tailored.length > 0 && (
              <>
                <h2 className="rs-section-title">Tailored for specific jobs</h2>
                <ResumeRows rows={tailored} onOpen={open} onDelete={setConfirming}
                  label={r => appLabel(r.application_id) || r.title}
                  meta={r => `Edited ${formatShortDate(r.updated_at.slice(0, 10), new Date(), profile.date_format)}`} />
              </>
            )}

            <ResumeInsights onUsed={loadUsage} />
          </>
        )}

      {confirming && (
        <ConfirmDialog
          message={`Delete "${confirming.title}"? This can't be undone.`}
          confirmLabel="Delete resume"
          onConfirm={() => remove(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </section>
  )
}

function ResumeRows({ rows, onOpen, onDelete, extra, meta, label = r => r.title }) {
  return (
    <ul className="rs-list">
      {rows.map(r => (
        <li key={r.id} className="rs-row">
          <button type="button" className="rs-row-main" onClick={() => onOpen(r.id)}>
            <span className="rs-row-title">{label(r)}</span>
            <span className="rs-row-meta">{meta(r)}</span>
          </button>
          <div className="rs-row-actions">
            {extra?.(r)}
            <IconButton icon="trash" label={`Delete ${r.title}`} onClick={() => onDelete(r)} />
          </div>
        </li>
      ))}
    </ul>
  )
}
