import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { updateRow } from '../../lib/db'
import { useData } from '../../state/DataProvider'
import { Button, Card, Field, Input, TextArea } from '../../ui'
import { errorMessage, resumeAi } from './api'
import { blankEducation, blankExperience, blankProject, cleanResume, normalizeResume, splitSkills } from './schema'
import ResumePrint from './ResumePrint'

const toLines = a => a.join('\n')
const fromLines = s => s.split('\n')
const SAVE_DELAY = 800

// Full-page resume editor. Saves automatically, like the rest of the app.
export default function ResumeEditor({ resumeId }) {
  const navigate = useNavigate()
  const { track, data } = useData()
  const [status, setStatus] = useState('loading')
  const [meta, setMeta] = useState(null) // { title, target_role, application_id }
  const [content, setContent] = useState(null)
  const [skillsText, setSkillsText] = useState('')
  const [linksText, setLinksText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [instruction, setInstruction] = useState('')
  const [aiBusy, setAiBusy] = useState(null) // key of the section being improved
  const [suggestion, setSuggestion] = useState(null) // { key, section, index, improved, notes }
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.from('resumes').select('*').eq('id', resumeId).maybeSingle().then(({ data: row, error: e }) => {
      if (!alive) return
      if (e) { setError(errorMessage(e)); setStatus('error'); return }
      if (!row) { navigate('/app/resumes', { replace: true }); return }
      const c = normalizeResume(row.content)
      setMeta({ title: row.title, target_role: row.target_role, application_id: row.application_id })
      setContent(c)
      setSkillsText(c.skills.join(', '))
      setLinksText(toLines(c.contact.links))
      setStatus('ready')
    })
    return () => { alive = false }
  }, [resumeId, navigate])

  // Latest values for saving from timers and on unmount.
  const latest = useRef({})
  latest.current = { meta, content, skillsText, linksText, dirty }

  const payload = useCallback(() => {
    const { meta: m, content: c, skillsText: s, linksText: l } = latest.current
    return {
      title: m.title.trim() || 'Untitled resume',
      target_role: m.target_role.trim(),
      content: cleanResume({ ...c, skills: splitSkills(s), contact: { ...c.contact, links: fromLines(l) } }),
    }
  }, [])

  const save = useCallback(async () => {
    if (!latest.current.dirty) return true
    setDirty(false)
    const { ok } = await track(updateRow('resumes', resumeId, payload()))
    if (!ok) setDirty(true)
    return ok
  }, [track, resumeId, payload])

  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(save, SAVE_DELAY)
    return () => clearTimeout(t)
  }, [dirty, meta, content, skillsText, linksText, save])

  // Save anything pending when leaving the editor or the page.
  useEffect(() => {
    const onUnload = e => { if (latest.current.dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      if (latest.current.dirty && latest.current.meta) track(updateRow('resumes', resumeId, payload()))
    }
  }, [track, resumeId, payload])

  if (status === 'loading') return <div className="empty-state">Loading…</div>
  if (status === 'error') {
    return <div className="empty-state error-state">Couldn't load this resume. {error} <Link to="/app/resumes">Back to resumes</Link></div>
  }

  const edit = fn => { setContent(c => { const next = structuredClone(c); fn(next); return next }); setDirty(true) }
  const setMetaField = (key, value) => { setMeta(m => ({ ...m, [key]: value })); setDirty(true) }

  async function improve(section, index) {
    const key = `${section}-${index ?? ''}`
    setError(''); setSuggestion(null)
    if (!(await save())) return // the AI reads the saved version
    setAiBusy(key)
    try {
      const res = await resumeAi('improve', { resume_id: resumeId, section, index, instruction: instruction.trim() || undefined })
      setSuggestion({ key, section, index, improved: res.improved, notes: res.notes || [] })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setAiBusy(null)
    }
  }

  function accept() {
    const { section, index, improved } = suggestion
    if (section === 'skills') {
      setSkillsText((Array.isArray(improved) ? improved : splitSkills(String(improved))).join(', '))
      setDirty(true)
    } else {
      const normalized = normalizeResume({ [section]: typeof index === 'number' ? [improved] : improved })
      edit(c => {
        if (typeof index === 'number') c[section][index] = normalized[section][0] ?? c[section][index]
        else c[section] = normalized[section]
      })
    }
    setSuggestion(null)
  }

  async function exportPdf() {
    if (await save()) setPrinting(true)
  }

  const linkedApp = meta.application_id && data.applications.rows.find(a => a.id === meta.application_id)

  // Render helpers (plain functions, so inputs keep focus between renders).
  const aiButton = (section, index) => {
    const key = `${section}-${index ?? ''}`
    return (
      <Button variant="ghost" size="sm" disabled={!!aiBusy} onClick={() => improve(section, index)}>
        {aiBusy === key ? 'Improving…' : 'Improve with AI'}
      </Button>
    )
  }

  const suggestionBox = (section, index) => {
    const key = `${section}-${index ?? ''}`
    if (suggestion?.key !== key) return null
    const s = suggestion.improved
    return (
      <div className="rs-suggestion" role="region" aria-label="Suggested version">
        <p className="rs-suggestion-title">Suggested version</p>
        {typeof s === 'string' && <p>{s}</p>}
        {Array.isArray(s) && section === 'skills' && <p>{s.join(', ')}</p>}
        {s && typeof s === 'object' && !Array.isArray(s) && (
          <>
            {[s.title, s.company, s.name, s.school].some(Boolean) && <p><strong>{[s.title, s.company, s.name, s.school].filter(Boolean).join(', ')}</strong></p>}
            {s.description && <p>{s.description}</p>}
            {(s.bullets || s.details)?.length > 0 && <ul>{(s.bullets || s.details).map((b, i) => <li key={i}>{b}</li>)}</ul>}
          </>
        )}
        {suggestion.notes.length > 0 && <ul className="rs-notes">{suggestion.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
        <div className="rs-actions">
          <Button variant="primary" size="sm" onClick={accept}>Use this version</Button>
          <Button size="sm" onClick={() => setSuggestion(null)}>Keep mine</Button>
        </div>
      </div>
    )
  }

  const field = (label, value, onChange, props = {}) => (
    <Field label={label}>
      <Input value={value} onChange={e => onChange(e.target.value)} {...props} />
    </Field>
  )

  const move = (list, i, dir) => edit(c => { const j = i + dir; [c[list][i], c[list][j]] = [c[list][j], c[list][i]] })
  const removeAt = (list, i) => edit(c => { c[list].splice(i, 1) })

  const entryActions = (list, i, count, withAi = true) => (
    <div className="rs-actions">
      {withAi && aiButton(list, i)}
      <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => move(list, i, -1)}>Move up</Button>
      <Button variant="ghost" size="sm" disabled={i === count - 1} onClick={() => move(list, i, 1)}>Move down</Button>
      <Button variant="ghost" size="sm" className="rs-remove" onClick={() => removeAt(list, i)}>Remove</Button>
    </div>
  )

  return (
    <section aria-label="Edit resume" className="rs-page rs-editor">
      <div className="page-row">
        <div className="page-heading">
          <Link to="/app/resumes" className="rs-back">Resumes</Link>
          <input className="title-input" value={meta.title} aria-label="Resume name" placeholder="Resume name" onChange={e => setMetaField('title', e.target.value)} />
          {linkedApp && <p className="rs-muted">Tailored for <Link to={`/app/applications/${linkedApp.id}`}>{[linkedApp.position, linkedApp.company].filter(Boolean).join(' at ') || 'an application'}</Link></p>}
        </div>
        <div className="page-actions">
          <Button icon="download" onClick={exportPdf}>Export PDF</Button>
        </div>
      </div>

      {error && <p className="rs-error" role="alert">{error}</p>}

      <Card as="section" className="rs-card" aria-label="Target and AI instructions">
        <div className="rs-grid">
          {field('Target role', meta.target_role, v => setMetaField('target_role', v), { placeholder: 'e.g. Supply Chain Analyst' })}
          {field('Instructions for AI edits', instruction, setInstruction, { placeholder: 'e.g. emphasize automation and cost savings' })}
        </div>
      </Card>

      <Card as="section" className="rs-card" aria-labelledby="rs-contact">
        <h2 className="rs-card-title" id="rs-contact">Contact</h2>
        <div className="rs-grid">
          {field('Full name', content.contact.name, v => edit(c => { c.contact.name = v }))}
          {field('Email', content.contact.email, v => edit(c => { c.contact.email = v }), { type: 'email' })}
          {field('Phone', content.contact.phone, v => edit(c => { c.contact.phone = v }), { type: 'tel' })}
          {field('Location', content.contact.location, v => edit(c => { c.contact.location = v }))}
        </div>
        <Field label="Links" hint="One per line, e.g. your LinkedIn or portfolio.">
          <TextArea className="rs-textarea" rows={2} value={linksText} onChange={e => { setLinksText(e.target.value); setDirty(true) }} />
        </Field>
      </Card>

      <Card as="section" className="rs-card" aria-labelledby="rs-summary">
        <div className="rs-card-head">
          <h2 className="rs-card-title" id="rs-summary">Summary</h2>
          {aiButton('summary')}
        </div>
        <TextArea className="rs-textarea" rows={4} aria-labelledby="rs-summary" value={content.summary} placeholder="Two or three lines on who you are and what you do best." onChange={e => edit(c => { c.summary = e.target.value })} />
        {suggestionBox('summary')}
      </Card>

      <Card as="section" className="rs-card" aria-labelledby="rs-experience">
        <div className="rs-card-head">
          <h2 className="rs-card-title" id="rs-experience">Experience</h2>
          <Button size="sm" icon="plus" onClick={() => edit(c => { c.experience.push(blankExperience()) })}>Add role</Button>
        </div>
        {content.experience.length === 0 && <p className="rs-muted">Add your most recent role first.</p>}
        {content.experience.map((x, i) => (
          <div key={i} className="rs-entry">
            <div className="rs-grid">
              {field('Title', x.title, v => edit(c => { c.experience[i].title = v }))}
              {field('Company', x.company, v => edit(c => { c.experience[i].company = v }))}
              {field('Location', x.location, v => edit(c => { c.experience[i].location = v }))}
              <div className="rs-grid rs-grid--pair">
                {field('Start', x.start, v => edit(c => { c.experience[i].start = v }), { placeholder: 'Jan 2024' })}
                {field('End', x.end, v => edit(c => { c.experience[i].end = v }), { placeholder: 'Present' })}
              </div>
            </div>
            <Field label="Bullets" hint="One per line.">
              <TextArea className="rs-textarea" rows={Math.max(3, x.bullets.length + 1)} value={toLines(x.bullets)} onChange={e => edit(c => { c.experience[i].bullets = fromLines(e.target.value) })} />
            </Field>
            {entryActions('experience', i, content.experience.length)}
            {suggestionBox('experience', i)}
          </div>
        ))}
      </Card>

      <Card as="section" className="rs-card" aria-labelledby="rs-projects">
        <div className="rs-card-head">
          <h2 className="rs-card-title" id="rs-projects">Projects</h2>
          <Button size="sm" icon="plus" onClick={() => edit(c => { c.projects.push(blankProject()) })}>Add project</Button>
        </div>
        {content.projects.length === 0 && <p className="rs-muted">Optional. Good for tools you've built or major initiatives.</p>}
        {content.projects.map((x, i) => (
          <div key={i} className="rs-entry">
            {field('Project name', x.name, v => edit(c => { c.projects[i].name = v }))}
            {field('Description', x.description, v => edit(c => { c.projects[i].description = v }))}
            <Field label="Bullets" hint="One per line.">
              <TextArea className="rs-textarea" rows={Math.max(2, x.bullets.length + 1)} value={toLines(x.bullets)} onChange={e => edit(c => { c.projects[i].bullets = fromLines(e.target.value) })} />
            </Field>
            {entryActions('projects', i, content.projects.length)}
            {suggestionBox('projects', i)}
          </div>
        ))}
      </Card>

      <Card as="section" className="rs-card" aria-labelledby="rs-education">
        <div className="rs-card-head">
          <h2 className="rs-card-title" id="rs-education">Education</h2>
          <Button size="sm" icon="plus" onClick={() => edit(c => { c.education.push(blankEducation()) })}>Add school</Button>
        </div>
        {content.education.map((x, i) => (
          <div key={i} className="rs-entry">
            <div className="rs-grid">
              {field('School', x.school, v => edit(c => { c.education[i].school = v }))}
              {field('Degree', x.degree, v => edit(c => { c.education[i].degree = v }))}
              {field('Field of study', x.field, v => edit(c => { c.education[i].field = v }))}
              <div className="rs-grid rs-grid--pair">
                {field('Start', x.start, v => edit(c => { c.education[i].start = v }))}
                {field('End', x.end, v => edit(c => { c.education[i].end = v }))}
              </div>
            </div>
            <Field label="Details" hint="Honors, minors, coursework. One per line.">
              <TextArea className="rs-textarea" rows={2} value={toLines(x.details)} onChange={e => edit(c => { c.education[i].details = fromLines(e.target.value) })} />
            </Field>
            {entryActions('education', i, content.education.length, false)}
          </div>
        ))}
      </Card>

      <Card as="section" className="rs-card" aria-labelledby="rs-skills">
        <div className="rs-card-head">
          <h2 className="rs-card-title" id="rs-skills">Skills</h2>
          {aiButton('skills')}
        </div>
        <Field label="Skills" hint="Separate with commas.">
          <TextArea className="rs-textarea" rows={3} value={skillsText} placeholder="Excel, Power BI, SQL" onChange={e => { setSkillsText(e.target.value); setDirty(true) }} />
        </Field>
        {suggestionBox('skills')}
      </Card>

      {printing && <ResumePrint content={payload().content} fileName={meta.title} onDone={() => setPrinting(false)} />}
    </section>
  )
}
