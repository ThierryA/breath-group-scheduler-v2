import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BlinkUIProvider, Toaster } from '@blinkdotnew/ui'
import App from './App'
import './index.css'
import { initTheme } from './hooks/useTheme'

// Apply saved theme before React renders to avoid flash of wrong theme
initTheme()

// Suppress the benign ResizeObserver loop notification warning.
// This fires when filter toggles cause layout shifts during observation cycles
// and does not indicate a real error — all observations complete on the next frame.
const _origError = window.onerror
window.onerror = (message, ...rest) => {
  if (typeof message === 'string' && message.includes('ResizeObserver loop')) return true
  return _origError ? _origError.call(window, message, ...rest) : false
}

const queryClient = new QueryClient()

// Prefetch public data immediately — don't wait for auth to resolve.
// DB security policy has require_auth: false so these succeed anonymously.
// By the time auth + member resolution finishes, data is already in cache.
import('@/features/availability/api').then(({ listAvailabilityEntries }) => {
  queryClient.prefetchQuery({ queryKey: ['availabilityEntries'], queryFn: listAvailabilityEntries })
})
import('@/features/availability/attendees-api').then(({ listAllAttendees }) => {
  queryClient.prefetchQuery({ queryKey: ['allAttendees'], queryFn: listAllAttendees })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BlinkUIProvider theme="linear" darkMode="class">
        <Toaster />
        <App />
      </BlinkUIProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
