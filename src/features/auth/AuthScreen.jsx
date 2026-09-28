import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import brand from '../../config/brand'
import { Button, Card, Field, Input, Logo } from '../../ui'

export default function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setInfo('Account created. Check your email to confirm it, then sign in.')
    }
    setLoading(false)
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="auth-head">
          <Logo variant="light" size={44} wordmark={brand.wordmark} />
          <h1 className="sr-only">{brand.name}</h1>
          <p className="auth-sub">{mode === 'signin' ? 'Sign in to your tracker' : 'Create an account'}</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <Field label="Email"><Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <Field label="Password"><Input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></Field>
          {error && <p className="auth-msg error" role="alert">{error}</p>}
          {info && <p className="auth-msg info">{info}</p>}
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <div className="auth-switch">
          <Button variant="link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}>
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Button>
        </div>
      </Card>
    </main>
  )
}
