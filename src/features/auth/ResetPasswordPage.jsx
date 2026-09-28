import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { Button, Field, Input } from '../../ui'
import AuthLayout from './AuthLayout'

// Landing page for the emailed reset link. Supabase signs the user in from
// the link (a short-lived recovery session); here they choose a new password.
// Signed-in users can also use it to change their password.
export default function ResetPasswordPage({ session, onDone }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMismatch(password !== confirm)
    if (password !== confirm) return
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    onDone?.()
  }

  return (
    <AuthLayout title={done ? 'Password updated' : 'Choose a new password'}>
      {!session && (
        <>
          <p className="auth-msg error" role="alert">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
          <div className="auth-links"><p><Link className="ui-btn--link" to="/">Back to sign in</Link></p></div>
        </>
      )}

      {session && done && (
        <div className="auth-form">
          <p className="auth-msg info" role="status">Your password has been changed.</p>
          <Button variant="primary" className="auth-submit" onClick={() => navigate('/app', { replace: true })}>Continue</Button>
        </div>
      )}

      {session && !done && (
        <form onSubmit={submit} className="auth-form">
          <Field label="New password" hint="At least 6 characters." error={error ? `${error} Try a different password.` : undefined}>
            <Input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} aria-invalid={Boolean(error)} />
          </Field>
          <Field label="Confirm new password" error={mismatch ? "Passwords don't match. Type the same password in both fields." : undefined}>
            <Input type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={e => { setConfirm(e.target.value); setMismatch(false) }} aria-invalid={mismatch} />
          </Field>
          <Button variant="primary" type="submit" className="auth-submit" disabled={loading}>{loading ? 'Please wait…' : 'Update password'}</Button>
        </form>
      )}
    </AuthLayout>
  )
}
