import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { callFunction, isMissing } from '../../lib/db'
import { markAccountDeleted } from '../../lib/account'
import brand from '../../config/brand'
import { DATE_FORMATS, formatShortDate, todayLocal } from '../../lib/format'
import { initialsFor, initialsFromParts } from '../../lib/initials'
import { useProfile } from '../../state/ProfileProvider'
import { useUser } from '../../state/UserContext'
import useTableViews from '../../state/useTableViews'
import { Button, Card, Field, Input, Modal, TextArea } from '../../ui'
import { ALL_VIEW } from '../views/ViewTabs'

export default function SettingsPage() {
  const { status } = useProfile()
  const unavailable = status === 'unavailable' || status === 'error'
  return (
    <section aria-labelledby="settings-title" className="settings">
      <div className="page-row">
        <div className="page-heading">
          <h1 className="page-title" id="settings-title">Profile and settings</h1>
        </div>
      </div>
      {unavailable && <p className="views-note" role="status">Profile and preferences can't be saved right now. Account settings still work.</p>}
      <ProfileSection disabled={unavailable || status === 'loading'} />
      <AccountSection />
      <DisplaySection disabled={unavailable || status === 'loading'} />
      <ConnectionsSection />
    </section>
  )
}

function SectionCard({ title, description, children }) {
  return (
    <Card as="section" className="settings-card" aria-label={title}>
      <div className="settings-card-head">
        <h2 className="settings-title">{title}</h2>
        {description && <p className="settings-desc">{description}</p>}
      </div>
      {children}
    </Card>
  )
}

function ProfileSection({ disabled }) {
  const { profile, save } = useProfile()
  const user = useUser()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const values = form || { ...profile, target_roles: profile.target_roles.join(', ') }
  const set = key => e => { setForm({ ...values, [key]: e.target.value }); setErrors({ ...errors, [key]: undefined }); setMessage('') }
  const initials = initialsFromParts(values.first_name, values.last_name) || initialsFor(user?.email)

  async function submit(e) {
    e.preventDefault()
    const roles = values.target_roles.split(',').map(r => r.trim()).filter(Boolean)
    const next = {}
    if (values.first_name.trim().length > 50) next.first_name = 'Use 50 characters or fewer.'
    if (values.last_name.trim().length > 50) next.last_name = 'Use 50 characters or fewer.'
    if (roles.length > 20) next.target_roles = 'List up to 20 roles, separated by commas.'
    else if (roles.some(r => r.length > 60)) next.target_roles = 'Keep each role under 60 characters.'
    if (values.location.trim().length > 100) next.location = 'Use 100 characters or fewer.'
    if (values.bio.length > 1000) next.bio = `Shorten your bio by ${values.bio.length - 1000} characters.`
    setErrors(next)
    if (Object.keys(next).length) return
    const ok = await save({ first_name: values.first_name.trim(), last_name: values.last_name.trim(), target_roles: roles, location: values.location.trim(), bio: values.bio })
    if (ok) { setForm(null); setMessage('Profile saved.') }
  }

  return (
    <SectionCard title="Profile" description={`How you appear in ${brand.name} and what you're looking for.`}>
      <form className="settings-form" onSubmit={submit}>
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <div className="settings-grid">
          <Field label="First name" error={errors.first_name}>
            <Input value={values.first_name} onChange={set('first_name')} autoComplete="given-name" disabled={disabled} />
          </Field>
          <Field label="Last name" error={errors.last_name}>
            <Input value={values.last_name} onChange={set('last_name')} autoComplete="family-name" disabled={disabled} />
          </Field>
          <Field label="Location" error={errors.location} className="span-all">
            <Input value={values.location} onChange={set('location')} placeholder="e.g. Chicago, IL or Remote" disabled={disabled} />
          </Field>
          <Field label="Target roles" hint="Separate roles with commas." error={errors.target_roles} className="span-all">
            <Input value={values.target_roles} onChange={set('target_roles')} placeholder="e.g. Product analyst, Data analyst" disabled={disabled} />
          </Field>
          <Field label="Bio" hint={`${values.bio.length}/1000`} error={errors.bio} className="span-all">
            <TextArea value={values.bio} onChange={set('bio')} placeholder="A few lines about your background and goals" disabled={disabled} />
          </Field>
        </div>
        <div className="settings-actions">
          {message && <span className="settings-ok" role="status">{message}</span>}
          <Button variant="primary" type="submit" disabled={disabled || !form}>Save profile</Button>
        </div>
      </form>
    </SectionCard>
  )
}

function AccountSection() {
  const user = useUser()
  const [email, setEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState({})
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState({})
  const [deleting, setDeleting] = useState(false)

  async function changeEmail(e) {
    e.preventDefault()
    setEmailMsg({})
    if (email.trim().toLowerCase() === (user?.email || '').toLowerCase()) {
      setEmailMsg({ error: "That's already your email. Enter a different address." })
      return
    }
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/app/settings` })
    if (error) setEmailMsg({ error: `${error.message} Check the address and try again.` })
    else { setEmail(''); setEmailMsg({ ok: 'Check your inbox (and your old one) for a link to confirm the change.' }) }
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwMsg({})
    if (pw.next !== pw.confirm) { setPwMsg({ mismatch: true }); return }
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    if (error) setPwMsg({ error: `${error.message} Try a different password.` })
    else { setPw({ next: '', confirm: '' }); setPwMsg({ ok: 'Password changed.' }) }
  }

  return (
    <SectionCard title="Account" description="Sign-in details for your account.">
      <form className="settings-form settings-row" onSubmit={changeEmail}>
        <Field label="Email" hint={emailMsg.ok || `Currently ${user?.email}.`} error={emailMsg.error}>
          <Input type="email" required value={email} onChange={e => { setEmail(e.target.value); setEmailMsg({}) }} placeholder="New email address" autoComplete="email" />
        </Field>
        <Button type="submit" disabled={!email.trim()}>Change email</Button>
      </form>

      <form className="settings-form" onSubmit={changePassword}>
        <div className="settings-grid">
          <Field label="New password" hint="At least 6 characters." error={pwMsg.error}>
            <Input type="password" required minLength={6} autoComplete="new-password" value={pw.next} onChange={e => { setPw({ ...pw, next: e.target.value }); setPwMsg({}) }} />
          </Field>
          <Field label="Confirm new password" error={pwMsg.mismatch ? "Passwords don't match. Type the same password in both fields." : undefined}>
            <Input type="password" required minLength={6} autoComplete="new-password" value={pw.confirm} onChange={e => { setPw({ ...pw, confirm: e.target.value }); setPwMsg({}) }} />
          </Field>
        </div>
        <div className="settings-actions">
          {pwMsg.ok && <span className="settings-ok" role="status">{pwMsg.ok}</span>}
          <Button type="submit" disabled={!pw.next}>Change password</Button>
        </div>
      </form>

      <div className="danger-zone">
        <div>
          <h3 className="danger-title">Delete account</h3>
          <p className="settings-desc">Permanently deletes your account and every application, conversation, company and view in it. This can't be undone.</p>
        </div>
        <Button variant="danger" onClick={() => setDeleting(true)}>Delete account</Button>
      </div>
      {deleting && <DeleteAccountDialog onCancel={() => setDeleting(false)} />}
    </SectionCard>
  )
}

function DeleteAccountDialog({ onCancel }) {
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirm(e) {
    e.preventDefault()
    if (typed !== 'DELETE') { setError('Type DELETE in capital letters to confirm.'); return }
    setBusy(true)
    try {
      await callFunction('delete_my_account')
      markAccountDeleted()
      await supabase.auth.signOut()
    } catch (err) {
      setBusy(false)
      setError(isMissing(err) ? "Account deletion isn't available yet. Nothing was deleted." : `${err.message} Nothing was deleted; try again.`)
    }
  }

  return (
    <Modal size="sm" role="alertdialog" onClose={onCancel} title={<span className="title-static">Delete your account?</span>}>
      <form className="settings-form" onSubmit={confirm}>
        <p className="settings-desc">Everything in your account is deleted right away. There's no undo.</p>
        <Field label="Type DELETE to confirm" error={error || undefined}>
          <Input value={typed} onChange={e => { setTyped(e.target.value); setError('') }} autoFocus autoComplete="off" />
        </Field>
        <div className="settings-actions">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" type="submit" disabled={busy}>{busy ? 'Deleting…' : 'Delete account'}</Button>
        </div>
      </form>
    </Modal>
  )
}

const TABS = [
  { table: 'applications', label: 'Applications', all: 'All applications' },
  { table: 'people', label: 'Conversations', all: 'All conversations' },
  { table: 'companies', label: 'Companies', all: 'All companies' },
]

function DisplaySection({ disabled }) {
  const { profile, save } = useProfile()
  const today = todayLocal()

  return (
    <SectionCard title="Display">
      <fieldset className="settings-fieldset">
        <legend className="settings-option">Start each tab on</legend>
        <p className="settings-desc">Which saved view each tab opens with. "All" shows everything.</p>
        <div className="settings-grid">
          {TABS.map(t => <DefaultViewSelect key={t.table} tab={t} />)}
        </div>
      </fieldset>
      <fieldset className="settings-fieldset">
        <legend className="settings-option">Date format</legend>
        <p className="settings-desc">How dates look everywhere in {brand.name}.</p>
        <div className="radio-group">
          {DATE_FORMATS.map(f => (
            <label key={f.value} className="radio-row">
              <input type="radio" name="date_format" value={f.value} checked={profile.date_format === f.value} disabled={disabled} onChange={() => save({ date_format: f.value })} />
              {formatShortDate(today, undefined, f.value)}
            </label>
          ))}
        </div>
      </fieldset>
    </SectionCard>
  )
}

// Per-tab defaults live on the views themselves. Until that's in the
// database, Applications falls back to the older default on the profile.
function DefaultViewSelect({ tab }) {
  const { profile, status: profileStatus, save } = useProfile()
  const { views, status, perTabDefaults, defaultId, setDefault } = useTableViews(tab.table)
  const legacy = tab.table === 'applications' && !perTabDefaults
  const current = legacy ? profile.default_view_id : defaultId
  const value = current && views.some(v => v.id === current) ? current : ALL_VIEW
  const off = status === 'unavailable' || status === 'error'

  return (
    <Field label={tab.label} hint={off ? "Saved views can't load right now." : views.length === 0 && status === 'ready' ? 'No saved views yet. Save one from Customize on that tab.' : undefined}>
      <select
        className="sk-input"
        disabled={off || (legacy && profileStatus === 'unavailable')}
        value={value}
        onChange={e => {
          const id = e.target.value === ALL_VIEW ? null : e.target.value
          if (legacy) save({ default_view_id: id })
          else setDefault(id)
        }}
      >
        <option value={ALL_VIEW}>{tab.all}</option>
        {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
    </Field>
  )
}

const CONNECTIONS = [
  { name: 'Chrome extension', desc: `Save any job posting to ${brand.name} in one click.`, action: 'Add to Chrome' },
  { name: 'Gmail', desc: 'Track applications and replies from your inbox automatically.', action: 'Connect' },
]

function ConnectionsSection() {
  return (
    <SectionCard title="Connections" description={`Link other tools to keep ${brand.name} up to date automatically.`}>
      {CONNECTIONS.map(c => (
        <div key={c.name} className="connection-row">
          <div>
            <p className="connection-name">{c.name} <span className="soon-badge">Coming soon</span></p>
            <p className="settings-desc">{c.desc}</p>
          </div>
          <Button disabled>{c.action}</Button>
        </div>
      ))}
    </SectionCard>
  )
}
