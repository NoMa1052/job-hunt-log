import { useState } from 'react'
import { Button, Card } from '../../ui'
import { errorMessage, resumeAi } from './api'

// Skills that keep showing up across saved job descriptions, and which of
// them the default resume is missing.
export default function ResumeInsights({ onUsed }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setBusy(true); setError('')
    try {
      setData(await resumeAi('insights'))
      onUsed?.()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card as="section" className="rs-card" aria-labelledby="rs-insights-title">
      <div className="rs-card-head">
        <div>
          <h2 className="rs-card-title" id="rs-insights-title">What your target jobs ask for</h2>
          <p className="rs-card-desc">Compares the job descriptions saved on your applications with your default resume.</p>
        </div>
        <Button onClick={run} disabled={busy}>{busy ? 'Analyzing…' : data ? 'Run again' : 'Analyze my applications'}</Button>
      </div>
      {error && <p className="rs-error" role="alert">{error}</p>}
      {data && (
        <>
          <p className="rs-muted">Based on {data.total_jobs} job descriptions.</p>
          <ul className="rs-bars">
            {(data.top_skills || []).map(s => (
              <li key={s.skill} className={s.on_resume ? '' : 'rs-bar--missing'}>
                <span className="rs-bar-label">{s.skill}{!s.on_resume && <span className="rs-bar-flag">Not on resume</span>}</span>
                <span className="rs-bar-track" aria-hidden="true"><span className="rs-bar-fill" style={{ width: `${Math.min(100, Math.round((s.job_count / Math.max(1, data.total_jobs)) * 100))}%` }} /></span>
                <span className="rs-bar-count">{s.job_count}<span className="sr-only"> jobs</span></span>
              </li>
            ))}
          </ul>
          {data.gaps?.length > 0 && (
            <>
              <h3 className="rs-subtitle">Gaps to close</h3>
              <ul className="rs-plain">{data.gaps.map(g => <li key={g.skill}><strong>{g.skill}</strong> ({g.job_count} jobs): {g.advice}</li>)}</ul>
            </>
          )}
          {data.recommendations?.length > 0 && (
            <>
              <h3 className="rs-subtitle">Next steps</h3>
              <ul className="rs-plain">{data.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </>
          )}
        </>
      )}
    </Card>
  )
}
