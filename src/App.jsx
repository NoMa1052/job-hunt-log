import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { DataProvider } from './state/DataProvider'
import { UserContext } from './state/UserContext'
import AppShell from './components/AppShell'
import AuthScreen from './features/auth/AuthScreen'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import ApplicationsPage from './features/applications/ApplicationsPage'
import ConversationsPage from './features/conversations/ConversationsPage'
import CompaniesPage from './features/companies/CompaniesPage'

export default function App() {
  const [session, setSession] = useState(undefined)
  // True after arriving from a password-reset email, until a new password is set.
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <p className="boot">Loading…</p>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage session={session} onDone={() => setRecovering(false)} />} />
        {session ? (
          <Route element={recovering ? <Navigate to="/reset-password" replace /> : <SignedIn user={session.user} />}>
            {/* "/" is reserved for the Phase 1 landing page; it redirects for now. */}
            <Route path="/" element={<Navigate to="/app/applications" replace />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="applications" replace />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="companies" element={<CompaniesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/app/applications" replace />} />
          </Route>
        ) : (
          // Signed out: any URL shows sign-in and stays put, so the user lands
          // where they were headed after signing in.
          <Route path="*" element={<AuthScreen />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

// Keyed by user: switching accounts remounts and clears everything in memory.
function SignedIn({ user }) {
  return (
    <UserContext.Provider value={user}>
      <DataProvider key={user.id} userId={user.id}>
        <Outlet />
      </DataProvider>
    </UserContext.Provider>
  )
}
