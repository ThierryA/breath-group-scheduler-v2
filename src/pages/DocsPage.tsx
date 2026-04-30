import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Section {
  id: string
  label: string
  sub?: { id: string; label: string }[]
}

const SECTIONS: Section[] = [
  { id: 'overview', label: 'Overview' },
  {
    id: 'getting-started', label: 'Getting Started',
    sub: [
      { id: 'access', label: 'Getting Access' },
      { id: 'signing-in', label: 'Signing In' },
    ],
  },
  {
    id: 'calendar', label: 'The Calendar',
    sub: [
      { id: 'timeline', label: 'Timeline View' },
      { id: 'mini-cal', label: 'Date Picker' },
      { id: 'filters', label: 'Filtering Sessions' },
      { id: 'timezone', label: 'Timezone Display' },
    ],
  },
  {
    id: 'sessions', label: 'Creating Sessions',
    sub: [
      { id: 'roles', label: 'Roles: Sitter & Breather' },
      { id: 'create-sitter', label: 'Creating a Sitter Session' },
      { id: 'create-breather', label: 'Adding Breather Availability' },
      { id: 'recurring', label: 'Recurring Sessions' },
    ],
  },
  {
    id: 'managing', label: 'Managing Sessions',
    sub: [
      { id: 'editing', label: 'Editing a Session' },
      { id: 'deleting', label: 'Deleting a Session' },
      { id: 'join', label: 'Joining a Sitter Session' },
    ],
  },
  {
    id: 'calendar-export', label: 'Calendar Export',
    sub: [
      { id: 'add-to-cal', label: 'Add to Calendar' },
    ],
  },
  {
    id: 'admin', label: 'Admin Guide',
    sub: [
      { id: 'admin-access', label: 'Accessing Admin Settings' },
      { id: 'adding-members', label: 'Adding Members' },
      { id: 'bulk-import', label: 'Bulk Import' },
      { id: 'member-roles', label: 'Roles & Capabilities' },
      { id: 'member-status', label: 'Member Status' },
      { id: 'blocking', label: 'Blocking & Removing' },
    ],
  },
  {
    id: 'install',
    label: 'Install App',
    sub: [
      { id: 'install-ios', label: 'iPhone & iPad (iOS)' },
      { id: 'install-android', label: 'Android' },
      { id: 'install-mac', label: 'macOS (Desktop)' },
      { id: 'install-windows', label: 'Windows (Desktop)' },
    ],
  },
  { id: 'faq', label: 'FAQ' },
]

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) {
    const offset = 80
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }
}

function Pill({ children, color = 'primary' }: { children: React.ReactNode; color?: 'primary' | 'accent' | 'muted' }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      color === 'primary' && 'bg-primary/10 text-primary',
      color === 'accent' && 'bg-accent/10 text-accent',
      color === 'muted' && 'bg-muted text-muted-foreground',
    )}>{children}</span>
  )
}

function Callout({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'tip' | 'warning' }) {
  return (
    <div className={cn(
      'my-5 rounded-lg border-l-4 px-4 py-3 text-sm',
      type === 'info' && 'border-primary/50 bg-primary/5 text-foreground',
      type === 'tip' && 'border-accent/60 bg-accent/5 text-foreground',
      type === 'warning' && 'border-amber-500/60 bg-amber-500/5 text-foreground',
    )}>
      <span className={cn(
        'mr-1.5 font-semibold',
        type === 'info' && 'text-primary',
        type === 'tip' && 'text-accent',
        type === 'warning' && 'text-amber-600',
      )}>
        {type === 'info' ? 'Note:' : type === 'tip' ? 'Tip:' : 'Important:'}
      </span>
      {children}
    </div>
  )
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-10 mb-3 scroll-mt-24 font-serif text-2xl font-semibold text-foreground">
      {children}
    </h2>
  )
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mt-7 mb-2.5 scroll-mt-24 text-lg font-semibold text-foreground">
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 leading-relaxed text-foreground/85">{children}</p>
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mb-4 space-y-1.5 pl-5 text-foreground/85">{children}</ul>
}

function LI({ children }: { children: React.ReactNode }) {
  return <li className="list-disc leading-relaxed">{children}</li>
}

function Divider() {
  return <hr className="my-8 border-border" />
}

function StepList({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <ol className="mb-4 space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div>
            <span className="font-semibold text-foreground">{s.title}</span>
            {s.desc && <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function TableRow({ cells }: { cells: (string | React.ReactNode)[] }) {
  return (
    <tr className="border-b border-border/60 text-sm">
      {cells.map((c, i) => (
        <td key={i} className={cn('px-4 py-2.5', i === 0 && 'font-medium text-foreground', i > 0 && 'text-muted-foreground')}>
          {c}
        </td>
      ))}
    </tr>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="mb-5 overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {headers.map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => <TableRow key={i} cells={r} />)}
        </tbody>
      </table>
    </div>
  )
}

interface DocsPageProps {
  onBack: () => void
  initialSection?: string
}

export function DocsPage({ onBack, initialSection }: DocsPageProps) {
  const [activeId, setActiveId] = useState('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Highlight active nav item based on scroll
  useEffect(() => {
    const allIds = SECTIONS.flatMap((s) => [s.id, ...(s.sub?.map((sub) => sub.id) ?? [])])

    function onScroll() {
      const scrollY = window.scrollY + 100
      let current = allIds[0]
      for (const id of allIds) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollY) current = id
      }
      setActiveId(current)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!initialSection) return
    const timer = setTimeout(() => {
      scrollToSection(initialSection)
    }, 200)
    return () => clearTimeout(timer)
  }, [initialSection])

  function handleNavClick(id: string) {
    setMobileNavOpen(false)
    scrollToSection(id)
  }

  const NavTree = () => (
    <nav className="space-y-0.5">
      {SECTIONS.map((section) => (
        <div key={section.id}>
          <button
            type="button"
            onClick={() => handleNavClick(section.id)}
            className={cn(
              'w-full rounded-md px-3 py-1.5 text-left text-sm font-medium transition',
              activeId === section.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {section.label}
          </button>
          {section.sub && (
            <div className="ml-3 mt-0.5 border-l border-border pl-3">
              {section.sub.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleNavClick(sub.id)}
                  className={cn(
                    'w-full rounded-md px-2 py-1 text-left text-xs transition',
                    activeId === sub.id
                      ? 'font-semibold text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to App</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <h1 className="font-serif text-base font-semibold text-foreground">Documentation</h1>
          </div>
          {/* Mobile nav toggle */}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground lg:hidden"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Contents
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="border-b border-border bg-background px-4 py-4 lg:hidden">
          <NavTree />
        </div>
      )}

      <div className="mx-auto flex max-w-6xl gap-0 px-4 sm:px-6">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20 py-8 pr-6">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Contents</p>
            <NavTree />
          </div>
        </aside>

        {/* Content */}
        <main ref={contentRef} className="min-w-0 flex-1 py-8 lg:pl-6 lg:border-l lg:border-border">
          {/* ─── Overview ─── */}
          <SectionHeading id="overview">Overview</SectionHeading>
          <P>
            <strong>Breath Group Scheduler</strong> is a shared calendar app for breathwork group members. It lets everyone
            in the group see who is available for sessions, post their own availability, and coordinate who will sit and who
            will breathe — all in one place.
          </P>
          <P>
            The app has two roles at the session level — <Pill color="accent">Sitter</Pill> and <Pill color="primary">Breather</Pill> — and an invite-only member system so that only people in your WhatsApp group can access it.
          </P>

          <Table
            headers={['What you can do', 'Who can do it']}
            rows={[
              ['View all upcoming sessions on the shared calendar', 'All signed-in members'],
              ['Post sitter availability', 'Members with Sitter capability'],
              ['Post breather availability', 'Members with Sitter & Breather capability'],
              ['Edit or delete your own sessions', 'The member who created them'],
              ['Join a sitter session as a breather', 'Any signed-in member'],
              ['Add or remove group members', 'Admins only'],
              ['Change member roles & capabilities', 'Admins only'],
            ]}
          />

          <Divider />

          {/* ─── Getting Started ─── */}
          <SectionHeading id="getting-started">Getting Started</SectionHeading>

          <SubHeading id="access">Getting Access</SubHeading>
          <P>
            The app is invite-only. An admin must add your email address before you can sign in. If you try to sign in with
            an email that hasn't been added yet, you'll see an <strong>"Access required"</strong> screen. Contact your group
            admin and ask them to add your email in the Admin settings.
          </P>
          <Callout type="info">
            Your email address must match exactly — including the domain. If your admin added
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">you@gmail.com</code> but you sign in with an
            Apple or Microsoft account using a different address, access will be denied.
          </Callout>

          <SubHeading id="signing-in">Signing In</SubHeading>
          <P>When you open the app for the first time, you'll see a simple sign-in screen. Supported providers:</P>
          <UL>
            <LI><strong>Email & password</strong> — create an account with your email address</LI>
            <LI><strong>Google</strong> — sign in with your Google account</LI>
            <LI><strong>Apple</strong> — sign in with your Apple ID</LI>
            <LI><strong>Microsoft</strong> — sign in with your Microsoft / Outlook account</LI>
          </UL>
          <P>
            After signing in for the first time, your account is automatically linked to your member record. Your status
            changes from <Pill color="muted">Invited</Pill> to <Pill color="accent">Active</Pill>. You'll then see the
            shared calendar with all upcoming sessions from your group.
          </P>

          <Divider />

          {/* ─── The Calendar ─── */}
          <SectionHeading id="calendar">The Calendar</SectionHeading>

          <SubHeading id="timeline">Timeline View</SubHeading>
          <P>
            The main view is a scrollable timeline that shows all upcoming sessions grouped by date. Each session card shows:
          </P>
          <UL>
            <LI>The role (<Pill color="accent">Sitter</Pill> or <Pill color="primary">Breather</Pill>)</LI>
            <LI>Member name and the time range (start → end)</LI>
            <LI>The timezone the session was posted in</LI>
            <LI>Any notes the member left</LI>
            <LI>For sitter sessions: how many breathers have joined</LI>
            <LI>A <strong>copy link</strong> button (appears on hover) that copies a direct link to share the session</LI>
          </UL>
          <P>
            Clicking any session card opens the <strong>Session Details</strong> panel on the right with full information and
            actions.
          </P>

          <SubHeading id="mini-cal">Date Picker</SubHeading>
          <P>
            On desktop, a mini calendar sits in the right sidebar. Clicking a date scrolls the timeline to that day.
            Days with sessions are shown with a small dot. On mobile, the mini calendar appears above the timeline.
          </P>

          <SubHeading id="filters">Filtering Sessions</SubHeading>
          <P>Three filter controls sit above the timeline:</P>
          <Table
            headers={['Filter', 'What it does']}
            rows={[
              ['All / Sitters / Breathers', 'Show all sessions, or only sitter or breather sessions'],
              ['Only mine', 'Show only the sessions you created (useful for editing your own schedule)'],
            ]}
          />

          <SubHeading id="timezone">Timezone Display</SubHeading>
          <P>
            Members can be in different timezones. Every session is stored with the timezone of the person who created it.
            The app always displays times converted to <em>your chosen display timezone</em> — which you can change using
            the timezone selector in the top navbar (desktop) or the overflow menu (mobile).
          </P>
          <Callout type="tip">
            If the times look wrong, check your display timezone in the top-right menu. It auto-detects your browser timezone
            when you first load the app.
          </Callout>

          <Divider />

          {/* ─── Creating Sessions ─── */}
          <SectionHeading id="sessions">Creating Sessions</SectionHeading>

          <SubHeading id="roles">Roles: Sitter &amp; Breather</SubHeading>
          <P>Every session in the app belongs to one of two roles:</P>
          <Table
            headers={['Role', 'What it means', 'Who can create']}
            rows={[
              [<Pill color="accent">Sitter</Pill>, 'You are offering to sit for a breathwork session — holding space for breathers', 'Members with Sitter capability'],
              [<Pill color="primary">Breather</Pill>, 'You are available to do a breathwork session and are looking for a sitter', 'Members with Sitter & Breather capability'],
            ]}
          />
          <Callout type="info">
            If you only see one option in the Create menu, your capability has been set to "Sitter only" or "Breather only"
            by an admin. Contact an admin if you'd like it changed.
          </Callout>

          <SubHeading id="create-sitter">Creating a Sitter Session</SubHeading>
          <StepList steps={[
            { title: 'Click the "Create" button', desc: 'The blue Create button is in the top-right corner of the navbar.' },
            { title: 'Select "Sitter session"', desc: 'Choose Sitter session from the dropdown menu.' },
            { title: 'Choose the date and time', desc: 'Pick the date, then set your start time and end time. The timezone is auto-detected from your browser.' },
            { title: 'Set max breathers (optional)', desc: 'If you want to limit how many breathers can join your session, enter a number. Leave blank for unlimited.' },
            { title: 'Add notes (optional)', desc: 'Leave any relevant details — location, style of session, requirements, etc.' },
            { title: 'Click Save', desc: 'Your session appears on the shared calendar immediately.' },
          ]} />

          <SubHeading id="create-breather">Adding Breather Availability</SubHeading>
          <StepList steps={[
            { title: 'Click the "Create" button', desc: '' },
            { title: 'Select "Breather availability"', desc: 'Choose from the dropdown.' },
            { title: 'Set your date and time window', desc: 'Enter the window during which you are available for a session.' },
            { title: 'Add notes (optional)', desc: 'Mention any preferences — style, location, special needs.' },
            { title: 'Click Save', desc: 'Your availability is visible to all group members, including sitters.' },
          ]} />

          <SubHeading id="recurring">Recurring Sessions</SubHeading>
          <P>
            When creating a <em>new</em> session, you can tick the <strong>"Recurring event"</strong> checkbox to schedule
            the same session across multiple dates automatically.
          </P>
          <Table
            headers={['Option', 'What it does']}
            rows={[
              ['Every week', 'Creates one session per week on the same day'],
              ['Every 2 weeks', 'Creates one session every two weeks'],
              ['Every month', 'Creates one session on the same day of each month'],
              ['Number of sessions', 'How many total occurrences to create (including the first)'],
            ]}
          />
          <P>
            All sessions in a recurring series are linked together. When you later edit or delete one, you'll be asked whether
            you want to affect <em>just that session</em> or <em>that session and all future ones</em> in the series.
          </P>
          <Callout type="tip">
            Recurring sessions are a great way for regular weekly sitters to keep their schedule up to date without creating
            each session manually.
          </Callout>

          <Divider />

          {/* ─── Managing Sessions ─── */}
          <SectionHeading id="managing">Managing Sessions</SectionHeading>

          <SubHeading id="editing">Editing a Session</SubHeading>
          <P>You can only edit sessions that you created. To edit:</P>
          <StepList steps={[
            { title: 'Find the session on the timeline', desc: 'Use the date picker or scroll to the date.' },
            { title: 'Click the pencil (edit) icon', desc: 'The edit icon appears on your session cards. You can also open the Session Details panel and click Edit there.' },
            { title: 'Modify the details', desc: 'Change date, time, notes, or max breathers.' },
            { title: 'Click Update', desc: 'Changes are saved immediately.' },
          ]} />
          <P>
            If the session is part of a recurring series, a dialog will appear asking:
          </P>
          <UL>
            <LI><strong>Update this session only</strong> — only the selected date is changed</LI>
            <LI><strong>Update this and all future sessions</strong> — all sessions from this date forward in the series are updated</LI>
          </UL>

          <SubHeading id="deleting">Deleting a Session</SubHeading>
          <P>
            To delete one of your sessions, open the edit panel by clicking the edit icon, then click the <strong>Delete</strong> button
            (red, bottom-left of the panel). For recurring sessions, you'll be asked:
          </P>
          <UL>
            <LI><strong>Delete this session only</strong> — removes just the selected occurrence</LI>
            <LI><strong>Delete this and all future sessions</strong> — removes all sessions from this date forward in the series</LI>
          </UL>
          <Callout type="warning">
            Deletion is permanent. There is no undo. Any breathers who had joined a deleted sitter session will also be removed
            from that session.
          </Callout>

          <SubHeading id="join">Joining a Sitter Session</SubHeading>
          <P>
            When a sitter has posted availability, breathers can sign up to join their session directly in the app.
          </P>
          <StepList steps={[
            { title: 'Find a Sitter session on the timeline', desc: 'Sitter sessions have a green Sitter badge.' },
            { title: 'Click on the session card', desc: 'The Session Details panel opens on the right.' },
            { title: 'Scroll to "Join as Breather"', desc: 'At the bottom of the panel. Your name and email are pre-filled if you are signed in.' },
            { title: 'Click "Join as Breather"', desc: "You are added to the session's attendee list, visible to the sitter and other members." },
          ]} />
          <P>
            The session card on the timeline shows a breather count badge (e.g. <Pill color="muted">2 breathers</Pill>) once
            people have joined. You can remove yourself from a session by clicking the minus icon next to your name in the
            attendee list.
          </P>
          <Callout type="info">
            If a sitter has set a max breather limit, joining will fail once that limit is reached. The session card shows
            remaining spots.
          </Callout>

          <Divider />

          {/* ─── Calendar Export ─── */}
          <SectionHeading id="calendar-export">Calendar Export</SectionHeading>

          <SubHeading id="add-to-cal">Add to Calendar</SubHeading>
          <P>
            Sitter sessions can be added directly to your personal calendar. Open a sitter session's detail panel and click
            the <strong>"Add to Calendar"</strong> button. Choose your preferred calendar:
          </P>
          <Table
            headers={['Option', 'What happens']}
            rows={[
              ['Google Calendar', 'Opens Google Calendar in a new tab with the event pre-filled'],
              ['Outlook', 'Opens Outlook Web with the event pre-filled'],
              ['Yahoo Calendar', 'Opens Yahoo Calendar with the event pre-filled'],
              ['Download .ics', 'Downloads an ICS file you can import into any calendar app (Apple Calendar, Thunderbird, etc.)'],
            ]}
          />

          <Divider />

          {/* ─── Admin Guide ─── */}
          <SectionHeading id="admin">Admin Guide</SectionHeading>
          <P>
            Admins have full access to the member management area. Only members with the <Pill>Admin</Pill> role can
            see these settings.
          </P>

          <SubHeading id="admin-access">Accessing Admin Settings</SubHeading>
          <P>
            Click your avatar (top-right corner) to open the account dropdown, then click <strong>Admin Console</strong>.
            This takes you to the Member Access management page.
          </P>

          <SubHeading id="adding-members">Adding Members</SubHeading>
          <P>
            Only pre-registered emails can sign in. To give someone access:
          </P>
          <StepList steps={[
            { title: 'Go to Admin Console', desc: 'Click your avatar → Admin Console.' },
            { title: 'Fill in the Add Member form', desc: 'Enter the person\'s email address, choose their role (Member or Admin), and choose their capability.' },
            { title: 'Click Add', desc: 'The member appears in the list with status Invited. They can now sign in.' },
          ]} />

          <SubHeading id="bulk-import">Bulk Import</SubHeading>
          <P>
            To add many members at once, click the <strong>Bulk import</strong> button in the top-right of the Admin Console.
            Paste a list of email addresses separated by commas or new lines. All imported members get:
          </P>
          <UL>
            <LI>Role: <strong>Member</strong></LI>
            <LI>Capability: <strong>Sitter &amp; Breather</strong></LI>
          </UL>
          <P>Duplicate emails are automatically skipped.</P>

          <SubHeading id="member-roles">Roles &amp; Capabilities</SubHeading>
          <Table
            headers={['Field', 'Options', 'Effect']}
            rows={[
              ['Role', 'Member', 'Can use the app but cannot manage other members'],
              ['Role', 'Admin', 'Can manage all members (add, edit, block, remove)'],
              ['Capability', 'Sitter & Breather', 'Can create both sitter sessions and breather availability'],
              ['Capability', 'Sitter only', 'Can only create sitter sessions'],
              ['Capability', 'Breather only', 'Can only post breather availability'],
            ]}
          />
          <P>
            You can change a member's role or capability at any time by using the dropdowns in the member table. Changes
            take effect immediately.
          </P>
          <Callout type="warning">
            You cannot change your own role or block yourself.
          </Callout>

          <SubHeading id="member-status">Member Status</SubHeading>
          <Table
            headers={['Status', 'Meaning']}
            rows={[
              [<Pill color="muted">Invited</Pill>, 'The email has been added but the person has not signed in yet'],
              [<Pill color="accent">Active</Pill>, 'The person has signed in and their account is linked'],
              [<Pill color="primary">Blocked</Pill>, 'Access is suspended — the person sees an "Access suspended" screen'],
            ]}
          />

          <SubHeading id="blocking">Blocking &amp; Removing Members</SubHeading>
          <P>
            Each member row has two action buttons:
          </P>
          <UL>
            <LI>
              <strong>Block</strong> — Suspends the member's access immediately. They cannot sign in or use the app.
              You can unblock them at any time.
            </LI>
            <LI>
              <strong>Remove</strong> — Permanently deletes the member record and <em>all their sessions and attendee records</em>.
              A confirmation dialog appears before deletion. This cannot be undone.
            </LI>
          </UL>

          <Divider />

          {/* ─── Install App ─── */}
          <SectionHeading id="install">Install App</SectionHeading>
          <P>
            Breath Group works as a <strong>Progressive Web App (PWA)</strong> — you can install it directly on your device like a native app,
            without going through any app store. Once installed, it opens in its own window, works faster, and supports push notifications.
          </P>

          <SubHeading id="install-ios">iPhone &amp; iPad (iOS)</SubHeading>
          <StepList steps={[
            { title: 'Open the app in Safari', desc: 'PWA installation on iOS requires Safari — other browsers do not support it.' },
            { title: 'Tap the Share button', desc: 'The Share button (square with an arrow pointing up) is at the bottom of the screen.' },
            { title: 'Scroll down and tap "Add to Home Screen"', desc: 'You may need to scroll the share sheet to find this option.' },
            { title: 'Tap "Add" to confirm', desc: 'The app icon appears on your home screen. Tap it to open the app in fullscreen mode.' },
          ]} />
          <Callout type="info">
            On iOS 16.4+, push notifications are supported when the app is installed to your home screen.
          </Callout>

          <SubHeading id="install-android">Android</SubHeading>
          <StepList steps={[
            { title: 'Open the app in Chrome', desc: 'Chrome is recommended for the best Android PWA experience.' },
            { title: 'Tap the three-dot menu (⋮)', desc: 'Located in the top-right corner of Chrome.' },
            { title: 'Tap "Add to Home screen" or "Install app"', desc: 'Depending on your Chrome version, you may see either option. Some devices show a banner at the bottom automatically.' },
            { title: 'Tap "Install" to confirm', desc: 'The app is installed and appears in your app drawer and home screen.' },
          ]} />
          <Callout type="tip">
            On Android, you can also enable push notifications directly within the app using the bell icon in the top toolbar.
          </Callout>

          <SubHeading id="install-mac">macOS (Desktop)</SubHeading>
          <StepList steps={[
            { title: 'Open the app in Chrome or Edge', desc: 'Safari on macOS does not support PWA installation. Use Chrome or Microsoft Edge.' },
            { title: 'Look for the install icon in the address bar', desc: 'A small install icon (computer with a download arrow) appears in the right side of the address bar when a PWA is available.' },
            { title: 'Click the install icon', desc: 'A confirmation popup appears.' },
            { title: 'Click "Install"', desc: 'The app opens in its own window and is added to your Applications folder and Dock.' },
          ]} />
          <Callout type="tip">
            In Chrome: if you don't see the install icon, go to the three-dot menu → "Cast, Save, and Share" → "Install page as app…"
          </Callout>

          <SubHeading id="install-windows">Windows (Desktop)</SubHeading>
          <StepList steps={[
            { title: 'Open the app in Chrome or Edge', desc: 'Microsoft Edge has excellent PWA support on Windows and is recommended.' },
            { title: 'Look for the install icon in the address bar', desc: 'A small "App available" install icon appears in the address bar.' },
            { title: 'Click the install icon', desc: 'A prompt appears asking if you want to install the app.' },
            { title: 'Click "Install"', desc: 'The app is installed and appears in the Start menu and can be pinned to the taskbar.' },
          ]} />
          <Callout type="info">
            In Microsoft Edge, you can also go to the three-dot menu → "Apps" → "Install this site as an app".
          </Callout>

          <Divider />

          {/* ─── FAQ ─── */}
          <SectionHeading id="faq">FAQ</SectionHeading>

          {([
            {
              q: "I signed in but see 'Access required' — what do I do?",
              a: "Your email hasn't been added to the group yet. Contact an admin and ask them to add your exact email address in Admin settings.",
            },
            {
              q: "Can I sign in with a different email than the one the admin registered?",
              a: "No. The email must match exactly. If the admin added you@gmail.com, sign in with Google using that address.",
            },
            {
              q: "The times look wrong on the calendar.",
              a: "Check your display timezone. Use the timezone selector in the top navbar (globe icon on desktop) to change it. The app auto-detects your browser timezone but it may not always be correct.",
            },
            {
              q: "Can I edit someone else's session?",
              a: "No. You can only edit and delete sessions that you created. Admins cannot edit sessions on behalf of other members either.",
            },
            {
              q: "What happens to my sessions if I'm removed by an admin?",
              a: "All your sessions (and any breathers who had joined them) are permanently deleted when your member record is removed.",
            },
            {
              q: "I created a recurring series but want to cancel only future sessions. Is that possible?",
              a: "Yes. Edit or delete any session in the series, and choose 'this and all future sessions' when prompted. Sessions before the selected date remain unchanged.",
            },
            {
              q: "How many breathers can join a sitter session?",
              a: "By default, unlimited. A sitter can set a max attendee count when creating their session. Once full, no more breathers can join.",
            },
            {
              q: "Can I add a session to my personal calendar?",
              a: "Yes, for sitter sessions. Open the session details panel and click 'Add to Calendar'. Choose Google Calendar, Outlook, Yahoo Calendar, or download an .ics file.",
            },
            {
              q: "I accidentally joined a sitter session. Can I leave?",
              a: "Yes. Open the session details panel, find your name in the attendee list, and click the remove (minus) icon next to your name.",
            },
          ] as { q: string; a: string }[]).map(({ q, a }) => (
            <div key={q} className="mb-5 rounded-lg border border-border bg-muted/10 p-4">
              <p className="mb-1.5 font-semibold text-foreground">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}

          <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
            <p className="font-serif text-lg font-semibold text-foreground mb-1">Still have questions?</p>
            <p className="text-sm text-muted-foreground">Reach out to your group admin or ask in the WhatsApp group.</p>
          </div>
        </main>
      </div>
    </div>
  )
}