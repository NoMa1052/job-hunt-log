import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const invoke = vi.fn()
const resumes = [
  { id: 'r1', title: 'Ops Analyst', is_default: true, application_id: null },
  { id: 'r2', title: 'Tailored', is_default: false, application_id: 'other-app' },
]

vi.mock('../../lib/supabaseClient', () => {
  const query = rows => {
    const q = {
      select: () => q, eq: () => q, order: () => q, limit: () => q,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (ok, bad) => Promise.resolve({ data: rows, error: null }).then(ok, bad),
    }
    return q
  }
  return {
    supabase: {
      from: table => query(table === 'resumes' ? resumes : []),
      functions: { invoke: (...args) => invoke(...args) },
    },
  }
})

import ApplicationAiSection from './ApplicationAiSection'

const app = { id: 'a1', company: 'Acme', position: 'Analyst', job_description: '', cover_letter: '', resume_id: null }
const renderSection = (props = {}) => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ApplicationAiSection app={{ ...app, ...props.app }} onUpdate={props.onUpdate || vi.fn().mockResolvedValue()} /></MemoryRouter>
)

afterEach(() => { cleanup(); invoke.mockReset() })

describe('ApplicationAiSection', () => {
  it('offers only untailored resumes and ones tailored for this application', async () => {
    renderSection()
    await waitFor(() => expect(screen.getByRole('option', { name: /Ops Analyst/ })).toBeTruthy())
    expect(screen.queryByRole('option', { name: /Tailored/ })).toBeNull()
  })

  it('asks for a job description before calling the AI', async () => {
    renderSection()
    const button = await screen.findByRole('button', { name: 'Score my match' })
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Paste the job description first.')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('saves the job description, then shows the match score', async () => {
    const onUpdate = vi.fn().mockResolvedValue()
    invoke.mockResolvedValue({ data: { score: 72, summary: 'Solid fit.', missing_keywords: ['SQL'] }, error: null })
    renderSection({ onUpdate })
    fireEvent.change(screen.getByLabelText('Job description'), { target: { value: 'We need SQL.' } })
    const button = await screen.findByRole('button', { name: 'Score my match' })
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)
    expect(await screen.findByText('72')).toBeTruthy()
    expect(screen.getByText('SQL')).toBeTruthy()
    expect(onUpdate).toHaveBeenCalledWith('job_description', 'We need SQL.')
    expect(invoke).toHaveBeenCalledWith('resume-ai', { body: { action: 'match', application_id: 'a1', resume_id: 'r1' } })
  })
})
