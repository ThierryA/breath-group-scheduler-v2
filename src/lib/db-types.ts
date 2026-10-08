// Auto-generated from your database schema — do not edit by hand.
// Regenerates automatically whenever a table is created or altered.

export type AppMembersRow = {
  id: string
  email: string
  appRole: string
  capabilities: string
  status: string
  userId: string | null
  createdAt: string
  displayName: string | null
  welcomeEmailCount: number | string
}

export type AvailabilityEntriesRow = {
  id: string
  name: string
  role: string
  date: string
  startTime: string
  endTime: string
  notes: string | null
  createdAt: string
  updatedAt: string
  timezone: string
  email: string
  userId: string | null
  maxAttendees: number | string | null
  recurringGroupId: string | null
  recurrenceRule: string | null
}

export type EmailLogRow = {
  id: string
  sentAt: string
  toEmail: string
  subject: string
  type: string
  status: string
  error: string | null
  memberId: string | null
}

export type NotificationsRow = {
  id: string
  userId: string
  type: string
  entryId: string | null
  actorName: string
  actorEmail: string | null
  message: string
  read: number | string
  createdAt: string
}

export type PushSubscriptionsRow = {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  createdAt: string
}

export type SessionAttendeesRow = {
  id: string
  entryId: string
  name: string
  createdAt: string
  email: string
}

export type UsersRow = {
  id: string
  email: string
  emailVerified: number | string | null
  displayName: string | null
  avatarUrl: string | null
  phone: string | null
  phoneVerified: number | string | null
  role: string | null
  metadata: string | null
  createdAt: string
  updatedAt: string
  lastSignIn: string
}
