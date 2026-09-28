import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { DataProvider } from './state/DataProvider'
import { UserContext } from './state/UserContext'
import { ProfileProvider } from './state/ProfileProvider'
import SettingsPage from './features/settings/SettingsPage'
import AppShell from './components/AppShell'
import AppReady from './components/AppReady'
import LoadingScreen from './components/LoadingScreen'
import AuthScreen from './features/auth/AuthScreen'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import ApplicationsPage from './features/applications/ApplicationsPage'
import ConversationsPage from './features/conversations/ConversationsPage'
import CompaniesPage from './features/companies/CompaniesPage'

export default function App() {
  const [session, setSession] = useState(undefined)
  // True after arriving from a password-reset email, until a new password is set.
  const [recovering, setRecovering] = useState(false)
  // The user whose data has finished its first load.
  const [loadedFor, setLoadedFor] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  const markLoaded = useCallback(() => setLoadedFor(userId), [userId])
  const ready = session !== undefined && (!session || recovering || loadedFor === userId)

  return (
    <>
      {session !== undefined && <AppRoutes session={session} recovering={recovering} setRecovering={setRecovering} onLoaded={markLoaded} />}
      {/* Keyed by user so signing in plays it again; signed out it skips. */}
      <LoadingScreen key={userId || 'signed-out'} ready={ready} />
    </>
  )
}

function AppRoutes({ session, recovering, setRecovering, onLoaded }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<><Loaded onLoaded={onLoaded} /><ResetPasswordPage session={session} onDone={() => setRecovering(false)} /></>} />
        {session ? (
          <Route element={recovering ? <Navigate to="/reset-password" replace /> : <SignedIn user={session.user} onLoaded={onLoaded} />}>
            {/* "/" is reserved for the Phase 1 landing page; it redirects for now. */}
            <Route path="/" element={<Navigate to="/app/applications" replace />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="applications" replace />} />
              <Route path="applications/:appId?" element={<ApplicationsPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="settings" element={<SettingsPage />} />
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
function SignedIn({ user, onLoaded }) {
  return (
    <UserContext.Provider value={user}>
      <DataProvider key={user.id} userId={user.id}>
        <ProfileProvider>
          <AppReady onReady={onLoaded} />
          <Outlet />
        </ProfileProvider>
      </DataProvider>
    </UserContext.Provider>
  )
}

// Pages outside the signed-in app have nothing to load.
function Loaded({ onLoaded }) {
  useEffect(() => { onLoaded() }, [onLoaded])
  return null
}
