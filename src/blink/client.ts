import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'breath-group-app-60lyovrv',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_-og2gGxlQy_DO-vdNdVByLC6F-cIDbZO',
  auth: { mode: 'headless', detectSessionInUrl: true },
})
