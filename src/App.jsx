import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { DataProvider } from './state/DataProvider'
import AppShell from './components/AppShell'
import AuthScreen from './features/auth/AuthScreen'
import ApplicationsPage from './features/applications/ApplicationsPage'
import ConversationsPage from './features/conversations/ConversationsPage'
import CompaniesPage from './features/companies/CompaniesPage'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="wrap"><p className="auth-loading">Loading…</p></div>
  }

  return (
    <BrowserRouter>
      {session === null ? (
        // Signed out: any URL shows the sign-in screen and stays put, so the
        // user lands where they were headed after signing in.
        <AuthScreen />
      ) : (
        // Keyed by user: switching accounts remounts and clears everything in memory.
        <DataProvider key={session.user.id} userId={session.user.id}>
          <Routes>
            {/* "/" is reserved for the Phase 1 landing page; it redirects for now. */}
            <Route path="/" element={<Navigate to="/app/applications" replace />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="applications" replace />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="companies" element={<CompaniesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/app/applications" replace />} />
          </Routes>
        </DataProvider>
      )}
    </BrowserRouter>
  )
}
