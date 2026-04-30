import { Repeat } from 'lucide-react'

interface RecurringConfirmDialogProps {
  open: boolean
  action: 'update' | 'delete'
  onThisOnly: () => void
  onAllFuture: () => void
  onCancel: () => void
}

export function RecurringConfirmDialog({
  open,
  action,
  onThisOnly,
  onAllFuture,
  onCancel,
}: RecurringConfirmDialogProps) {
  if (!open) return null

  const verb = action === 'delete' ? 'Delete' : 'Update'
  const desc =
    action === 'delete'
      ? 'Do you want to delete just this session, or this and all future sessions in the series?'
      : 'Do you want to update just this session, or this and all future sessions in the series?'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/30"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-xl">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Repeat className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{verb} recurring session</h3>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">{desc}</p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onThisOnly}
            className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            {verb} this session only
          </button>
          <button
            type="button"
            onClick={onAllFuture}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {verb} this and all future sessions
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-md px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
