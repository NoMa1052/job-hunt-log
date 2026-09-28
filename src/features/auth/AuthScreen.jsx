import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import brand from '../../config/brand'
import { Button, Card, Field, Input, Logo } from '../../ui'

const SUBTITLES = {
  signin: 'Sign in to your tracker',
  signup: 'Create an account',
  forgot: 'Reset your password',
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next) { setMode(next); setError(''); setInfo('') }

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    const origin = window.location.origin
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else if (mode === 'signup') {
      // The confirmation email links back to this deployment, not a fixed URL.
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/app` } })
      if (error) setError(error.message)
      else setInfo('Account created. Check your email to confirm it, then sign in.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })
      // Same message whether or not the account exists, so emails can't be probed.
      if (error && error.status !== 400) setError(error.message)
      else setInfo("If there's an account for that email, we've sent a link to reset the password.")
    }
    setLoading(false)
  }

  const submitLabel = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link' }[mode]

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="auth-head">
          <Logo variant="light" size={44} wordmark={brand.wordmark} />
          <h1 className="sr-only">{brand.name}</h1>
          <p className="auth-sub">{SUBTITLES[mode]}</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <Field label="Email"><Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
          {mode !== 'forgot' && (
            <Field label="Password"><Input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></Field>
          )}
          {error && <p className="auth-msg error" role="alert">{error}</p>}
          {info && <p className="auth-msg info">{info}</p>}
          <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Please wait…' : submitLabel}</Button>
        </form>
        <div className="auth-switch auth-switch--stack">
          {mode === 'signin' && <Button variant="link" onClick={() => switchMode('forgot')}>Forgot password?</Button>}
          {mode === 'signin' && <Button variant="link" onClick={() => switchMode('signup')}>Don't have an account? Sign up</Button>}
          {mode !== 'signin' && <Button variant="link" onClick={() => switchMode('signin')}>Back to sign in</Button>}
        </div>
      </Card>
    </main>
  )
}
