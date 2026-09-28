import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { friendlyMessage, isMissing } from '../../lib/db'

export class AiError extends Error {
  constructor(message, code, details = {}) {
    super(message)
    this.name = 'AiError'
    this.code = code
    this.details = details
  }
}

// One entry point for every AI action in the resume-ai Edge Function:
// usage, parse, improve, match, tailor, cover_letter, insights.
export async function resumeAi(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('resume-ai', { body: { action, ...payload } })
  if (error) {
    let body = {}
    try { body = await error.context.json() } catch { /* network or non-JSON error */ }
    throw new AiError(body.error || "Can't reach the AI service. Check your connection and try again.", body.code, body)
  }
  return data
}

export function errorMessage(err) {
  if (err?.code === 'upgrade_required') return 'This is a Pro feature.'
  if (err?.code === 'limit_reached') return `You've used all ${err.details.limit} this month. Your limit resets on the 1st.`
  if (err instanceof AiError) return err.message
  return friendlyMessage(err)
}

// Whether the resume tables exist in this database. They ship with a
// migration; until it's applied the feature stays hidden instead of failing.
let availability = null
export function checkResumesAvailable() {
  if (!availability) {
    availability = supabase.from('resumes').select('id', { head: true, count: 'exact' }).limit(1)
      .then(({ error }) => !(error && isMissing({ cause: error })))
      .catch(() => false)
  }
  return availability
}

export function useResumesAvailable() {
  const [available, setAvailable] = useState(null) // null while checking
  useEffect(() => {
    let alive = true
    checkResumesAvailable().then(v => { if (alive) setAvailable(v) })
    return () => { alive = false }
  }, [])
  return available
}

export async function listResumes() {
  const { data, error } = await supabase.from('resumes')
    .select('id, title, target_role, is_default, application_id, parent_resume_id, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}
