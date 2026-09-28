import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import brand from '../../config/brand'
import { Button, Card, Field, Input, Logo } from '../../ui'

// Landing page for the emailed reset link. Supabase signs the user in from
// the link (a short-lived recovery session); here they choose a new password.
// Signed-in users can also use it to change their password.
export default function ResetPasswordPage({ session, onDone }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError("Passwords don't match."); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    onDone?.()
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="auth-head">
          <Logo variant="light" size={44} wordmark={brand.wordmark} />
          <h1 className="sr-only">{brand.name}: reset password</h1>
          <p className="auth-sub">{done ? 'Password updated' : 'Choose a new password'}</p>
        </div>

        {!session && (
          <>
            <p className="auth-msg error" role="alert">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
            <div className="auth-switch"><Link className="ui-btn ui-btn--link" to="/">Back to sign in</Link></div>
          </>
        )}

        {session && done && (
          <>
            <p className="auth-msg info">Your password has been changed.</p>
            <div className="auth-form"><Button variant="primary" onClick={() => navigate('/app', { replace: true })}>Continue</Button></div>
          </>
        )}

        {session && !done && (
          <form onSubmit={submit} className="auth-form">
            <Field label="New password"><Input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></Field>
            <Field label="Confirm new password"><Input type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} /></Field>
            {error && <p className="auth-msg error" role="alert">{error}</p>}
            <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Please wait…' : 'Update password'}</Button>
          </form>
        )}
      </Card>
    </main>
  )
}
