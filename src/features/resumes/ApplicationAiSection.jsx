import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { Button, ConfirmDialog, Field, Select, TextArea } from '../../ui'
import { errorMessage, listResumes, resumeAi } from './api'
import { scoreBand } from './schema'
import './resumes.css'

const TONES = [
  { value: 'warm', label: 'Warm' },
  { value: 'direct', label: 'Direct' },
  { value: 'formal', label: 'Formal' },
]

// Job description, match score, tailored resume and cover letter for one
// application. Lives inside the application side panel.
export default function ApplicationAiSection({ app, onUpdate }) {
  const navigate = useNavigate()
  const [jd, setJd] = useState(app.job_description || '')
  const [letter, setLetter] = useState(app.cover_letter || '')
  const [resumes, setResumes] = useState(null)
  const [match, setMatch] = useState(null)
  const [tone, setTone] = useState('warm')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmReplace, setConfirmReplace] = useState(false)

  useEffect(() => {
    let alive = true
    listResumes()
      .then(rows => { if (alive) setResumes(rows.filter(r => !r.application_id || r.application_id === app.id)) })
      .catch(() => { if (alive) setResumes([]) })
    supabase.from('resume_matches').select('score, result, created_at').eq('application_id', app.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (alive && data) setMatch({ ...data.result, score: data.score }) })
    return () => { alive = false }
  }, [app.id])

  const defaultResume = resumes?.find(r => r.is_default) || resumes?.find(r => !r.application_id)
  const resumeId = (resumes?.some(r => r.id === app.resume_id) && app.resume_id) || defaultResume?.id || ''

  const saveJd = () => onUpdate('job_description', jd)
  const saveLetter = () => onUpdate('cover_letter', letter)

  async function run(key, fn) {
    setError(''); setNotice('')
    if (!jd.trim()) { setError('Paste the job description first.'); return }
    setBusy(key)
    try {
      await saveJd() // the AI reads the saved application
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy('')
    }
  }

  const scoreMatch = () => run('match', async () => {
    const res = await resumeAi('match', { application_id: app.id, resume_id: resumeId || undefined })
    setMatch(res)
  })

  const tailor = () => run('tailor', async () => {
    const res = await resumeAi('tailor', { application_id: app.id, resume_id: defaultResume?.id })
    setResumes(rs => [res.resume, ...(rs || [])])
    await onUpdate('resume_id', res.resume.id)
    setNotice('Tailored resume created and linked to this application.')
  })

  const writeLetter = useDraft => run('letter', async () => {
    const res = await resumeAi('cover_letter', { application_id: app.id, resume_id: resumeId || undefined, tone, draft: useDraft ? letter : '' })
    const text = res.cover_letter || ''
    setLetter(text)
    await onUpdate('cover_letter', text)
  })

  async function copyLetter() {
    try { await navigator.clipboard.writeText(letter); setNotice('Cover letter copied.') }
    catch { setError("Couldn't copy. Select the text and copy it instead.") }
  }

  const resumeOptions = (resumes || []).map(r => ({
    value: r.id,
    label: `${r.title}${r.is_default ? ' (default)' : ''}${r.application_id ? ' (tailored)' : ''}`,
  }))

  return (
    <section className="panel-section rs-app" aria-labelledby={`rs-app-${app.id}`}>
      <h3 className="panel-heading" id={`rs-app-${app.id}`}>Resume and cover letter</h3>

      <Field label="Job description" hint="Paste the full posting. Used for match scores, tailoring and cover letters.">
        <TextArea className="rs-textarea" rows={6} value={jd} onChange={e => setJd(e.target.value)} onBlur={saveJd} />
      </Field>

      {resumes && resumes.length === 0 ? (
        <p className="panel-hint rs-gap">Add a resume to score your match and tailor it to this job. <Link to="/app/resumes">Go to resumes</Link></p>
      ) : (
        <div className="rs-gap">
          <Field label="Resume for this job">
            <Select options={resumeOptions} value={resumeId} disabled={!resumes || !!busy} onChange={v => onUpdate('resume_id', v || null)} />
          </Field>
          <div className="rs-actions">
            <Button size="sm" disabled={!resumes || !!busy} onClick={scoreMatch}>{busy === 'match' ? 'Scoring…' : match ? 'Score again' : 'Score my match'}</Button>
            <Button size="sm" disabled={!resumes || !!busy} onClick={tailor}>{busy === 'tailor' ? 'Tailoring…' : 'Tailor resume to this job'}</Button>
            {resumeId && <Button variant="ghost" size="sm" onClick={() => navigate(`/app/resumes/${resumeId}`)}>Open resume</Button>}
          </div>
        </div>
      )}

      {error && <p className="rs-error" role="alert">{error}</p>}
      {notice && <p className="rs-status" role="status">{notice}</p>}

      {match && (
        <div className="rs-match">
          <div className={`rs-score rs-score--${scoreBand(match.score)}`} style={{ '--score': match.score }}>
            <span className="rs-score-num">{match.score}</span>
            <span className="rs-score-label">match</span>
          </div>
          <div className="rs-match-body">
            {match.summary && <p>{match.summary}</p>}
            {match.missing_keywords?.length > 0 && (
              <>
                <h4 className="rs-subtitle">Missing from your resume</h4>
                <ul className="rs-keywords">{match.missing_keywords.map(k => <li key={k}>{k}</li>)}</ul>
              </>
            )}
          </div>
        </div>
      )}
      {match?.strengths?.length > 0 && (
        <>
          <h4 className="rs-subtitle">Already strong</h4>
          <ul className="rs-plain">{match.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </>
      )}
      {match?.suggestions?.length > 0 && (
        <>
          <h4 className="rs-subtitle">Suggested rewrites</h4>
          <ul className="rs-rewrites">
            {match.suggestions.map((s, i) => (
              <li key={i}>
                {s.original && <p className="rs-before">{s.original}</p>}
                <p className="rs-after">{s.suggested}</p>
                {s.why && <p className="rs-muted">{s.why}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="rs-gap">
        <Field label="Cover letter draft">
          <TextArea className="rs-textarea" rows={10} value={letter} placeholder="Write your own, or have AI write a first draft." onChange={e => setLetter(e.target.value)} onBlur={saveLetter} />
        </Field>
        <div className="rs-actions rs-actions--letter">
          <Select className="rs-tone" aria-label="Tone" options={TONES} value={tone} onChange={setTone} />
          {letter.trim() ? (
            <>
              <Button size="sm" disabled={!!busy} onClick={() => writeLetter(true)}>{busy === 'letter' ? 'Writing…' : 'Improve my draft'}</Button>
              <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => setConfirmReplace(true)}>Write a new one</Button>
              <Button variant="ghost" size="sm" onClick={copyLetter}>Copy</Button>
            </>
          ) : (
            <Button size="sm" disabled={!!busy} onClick={() => writeLetter(false)}>{busy === 'letter' ? 'Writing…' : 'Write a first draft'}</Button>
          )}
        </div>
      </div>

      {confirmReplace && (
        <ConfirmDialog
          message="Replace your current cover letter with a new draft?"
          confirmLabel="Replace draft"
          onConfirm={() => { setConfirmReplace(false); writeLetter(false) }}
          onCancel={() => setConfirmReplace(false)}
        />
      )}
    </section>
  )
}
