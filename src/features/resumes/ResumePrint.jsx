import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { dateRange, normalizeResume } from './schema'

// Renders a clean resume at the top level of the page, opens the print
// dialog (where the user picks "Save as PDF"), then calls onDone.
export default function ResumePrint({ content, fileName, onDone }) {
  const r = normalizeResume(content)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  // Runs once per export.
  useEffect(() => {
    const previousTitle = document.title
    document.title = fileName || 'Resume' // becomes the default PDF file name
    document.body.classList.add('rs-printing')
    const done = () => doneRef.current?.()
    window.addEventListener('afterprint', done)
    const timer = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', done)
      document.body.classList.remove('rs-printing')
      document.title = previousTitle
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const contact = [r.contact.email, r.contact.phone, r.contact.location, ...r.contact.links].filter(Boolean)

  return createPortal(
    <div className="rs-print">
      <header>
        <h1>{r.contact.name}</h1>
        {contact.length > 0 && <p className="rs-print-contact">{contact.join('  |  ')}</p>}
      </header>
      {r.summary && <section><h2>Summary</h2><p>{r.summary}</p></section>}
      {r.experience.length > 0 && (
        <section>
          <h2>Experience</h2>
          {r.experience.map((x, i) => (
            <div key={i} className="rs-print-entry">
              <div className="rs-print-row"><strong>{x.title}</strong><span>{dateRange(x.start, x.end)}</span></div>
              <div className="rs-print-row rs-print-sub"><span>{x.company}</span><span>{x.location}</span></div>
              {x.bullets.length > 0 && <ul>{x.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
            </div>
          ))}
        </section>
      )}
      {r.projects.length > 0 && (
        <section>
          <h2>Projects</h2>
          {r.projects.map((x, i) => (
            <div key={i} className="rs-print-entry">
              <strong>{x.name}</strong>
              {x.description && <p>{x.description}</p>}
              {x.bullets.length > 0 && <ul>{x.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
            </div>
          ))}
        </section>
      )}
      {r.education.length > 0 && (
        <section>
          <h2>Education</h2>
          {r.education.map((x, i) => (
            <div key={i} className="rs-print-entry">
              <div className="rs-print-row"><strong>{x.school}</strong><span>{dateRange(x.start, x.end)}</span></div>
              <div className="rs-print-sub">{[x.degree, x.field].filter(Boolean).join(', ')}</div>
              {x.details.length > 0 && <ul>{x.details.map((b, j) => <li key={j}>{b}</li>)}</ul>}
            </div>
          ))}
        </section>
      )}
      {r.skills.length > 0 && <section><h2>Skills</h2><p>{r.skills.join(', ')}</p></section>}
    </div>,
    document.body,
  )
}
