'use client';

import * as React from 'react';
import { AlertTriangleIcon, CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CopilotMessage, PendingActionStatus } from '@/context/CopilotContext';
import type { PendingActionChange } from '@/app/lib/api/copilotApi';

interface PendingActionCardProps {
  message: CopilotMessage;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  labels: {
    proposedChanges: string;
    confirmDeleteTitle: string;
    confirmDeleteBody: string;
    apply: string;
    cancel: string;
    confirmDelete: string;
    applied: string;
    cancelled: string;
  };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  return String(value);
}

function ResolutionNote({
  status,
  labels,
}: {
  status: PendingActionStatus;
  labels: PendingActionCardProps['labels'];
}) {
  const applied = status === 'applied';
  return (
    <div
      className={
        'mt-2 flex items-center gap-1.5 text-xs ' +
        (applied ? 'text-primary' : 'text-muted-foreground')
      }
    >
      {applied ? <CheckIcon className="size-3.5" /> : <XIcon className="size-3.5" />}
      <span>{applied ? labels.applied : labels.cancelled}</span>
    </div>
  );
}

function ChangeRow({ change }: { change: PendingActionChange }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 text-sm sm:flex-row sm:items-baseline sm:gap-2">
      <span className="min-w-32 font-medium text-foreground">{change.label}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground line-through">{formatValue(change.old)}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-medium text-foreground">{formatValue(change.new)}</span>
      </span>
    </div>
  );
}

export function PendingActionCard({
  message,
  disabled,
  onConfirm,
  onCancel,
  labels,
}: PendingActionCardProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const action = message.pendingAction;
  if (!action) {
    return message.pendingStatus ? (
      <ResolutionNote status={message.pendingStatus} labels={labels} />
    ) : null;
  }

  const resolved = message.pendingStatus !== undefined;
  const busy = disabled ?? false;
  const entityName = action.preview.entity_name ?? '';

  if (resolved) {
    return <ResolutionNote status={message.pendingStatus!} labels={labels} />;
  }

  if (action.tier === 'delete') {
    return (
      <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span>{labels.confirmDeleteTitle}</span>
        </div>
        {entityName && <p className="mt-1 text-sm text-foreground">{entityName}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => setDeleteOpen(true)}
          >
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {labels.confirmDelete}
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={onCancel}>
            {labels.cancel}
          </Button>
        </div>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{labels.confirmDeleteTitle}</DialogTitle>
              <DialogDescription>
                {labels.confirmDeleteBody.replace('{name}', entityName)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  {labels.cancel}
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setDeleteOpen(false);
                  onConfirm();
                }}
              >
                {labels.confirmDelete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Tier-2 update: form-preview diff.
  const changes = action.preview.changes ?? [];
  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">{labels.proposedChanges}</p>
      {entityName && <p className="text-xs text-muted-foreground">{entityName}</p>}
      <div className="mt-2 divide-y divide-border">
        {changes.map((c) => (
          <ChangeRow key={c.field} change={c} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={onConfirm}>
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {labels.apply}
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={onCancel}>
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
