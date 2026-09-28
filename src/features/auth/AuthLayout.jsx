import brand from '../../config/brand'
import { Card } from '../../ui'
import SidekickLogo from '../../components/SidekickLogo'

// Shared frame for sign in, sign up and password reset: a centered card with
// the logo, wordmark and tagline on top.
export default function AuthLayout({ title, children }) {
  return (
    <main className="sk-app auth-page">
      <Card className="auth-card">
        <div className="auth-head">
          <SidekickLogo size={48} title={brand.name} className="auth-logo" />
          <p className="auth-wordmark" aria-hidden="true">{brand.wordmark}</p>
          <p className="auth-tagline">{brand.tagline}</p>
        </div>
        <h1 className="auth-title">{title}</h1>
        {children}
      </Card>
    </main>
  )
}
