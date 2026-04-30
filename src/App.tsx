import { useState, useEffect } from 'react'
import { useAppUser } from '@/hooks/useAppUser'
import { useAutoPush } from '@/hooks/useAutoPush'
import { useTheme } from '@/hooks/useTheme'
import { AccessGate } from '@/components/AccessGate'
import { HomePage } from '@/pages/HomePage'
import { AdminPage } from '@/pages/AdminPage'
import { DocsPage } from '@/pages/DocsPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  const { status, user, member, isAdmin, signInWithEmail, signUp, signInWithGoogle, signInWithApple, signInWithMicrosoft, logout } = useAppUser()
  const { theme, setTheme } = useTheme()
  useAutoPush(user?.id)
  const [page, setPage] = useState<'home' | 'admin' | 'docs' | 'settings'>('home')
  const [docsScrollTarget, setDocsScrollTarget] = useState<string | undefined>(undefined)

  // Sync hash on load
  useEffect(() => {
    if (window.location.hash === '#admin') setPage('admin')
    if (window.location.hash === '#docs') setPage('docs')
    if (window.location.hash === '#settings') setPage('settings')
  }, [])

  function goAdmin() {
    window.location.hash = '#admin'
    setPage('admin')
  }

  function goDocs() {
    window.location.hash = '#docs'
    setDocsScrollTarget(undefined)
    setPage('docs')
  }

  function goInstallDocs() {
    window.location.hash = '#docs'
    setDocsScrollTarget('install')
    setPage('docs')
  }

  function goSettings() {
    window.location.hash = '#settings'
    setPage('settings')
  }

  function goHome() {
    window.location.hash = ''
    setPage('home')
    setDocsScrollTarget(undefined)
  }

  return (
    <AccessGate
      status={status}
      user={user}
      member={member}
      onSignInWithEmail={signInWithEmail}
      onSignUp={signUp}
      onSignInWithGoogle={signInWithGoogle}
      onSignInWithApple={signInWithApple}
      onSignInWithMicrosoft={signInWithMicrosoft}
      onLogout={logout}
      onRetry={() => window.location.reload()}
    >
      {page === 'docs' ? (
        <DocsPage onBack={goHome} initialSection={docsScrollTarget} />
      ) : page === 'settings' && user ? (
        <SettingsPage user={user} onBack={goHome} theme={theme} onThemeChange={setTheme} />
      ) : page === 'admin' && isAdmin ? (
        <AdminPage currentUserEmail={user?.email ?? ''} onBack={goHome} />
      ) : (
        <HomePage
          user={user!}
          member={member!}
          isAdmin={isAdmin}
          onNavigateAdmin={goAdmin}
          onNavigateDocs={goDocs}
          onNavigateInstall={goInstallDocs}
          onNavigateSettings={goSettings}
          login={() => {}}
          logout={logout}
        />
      )}
    </AccessGate>
  )
}

export default App
