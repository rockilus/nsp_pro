'use client';

import { AlertCircleIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { CopilotMessage } from '@/context/CopilotContext';
import Markdown from './markdown';
import { PendingActionCard } from './pending-action-card';

interface ChatMessageProps {
  message: CopilotMessage;
  errorLabel: string;
  retryLabel: string;
  onRetry: () => void;
  actionDisabled?: boolean;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  actionLabels: ComponentProps<typeof PendingActionCard>['labels'];
}

export function ChatMessage({
  message,
  errorLabel,
  retryLabel,
  onRetry,
  actionDisabled,
  onConfirmAction,
  onCancelAction,
  actionLabels,
}: ChatMessageProps) {
  // Hidden turns (synthetic confirmation notifications) are replayed to the
  // model but never rendered in the UI.
  if (message.hidden) return null;

  if (message.isError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col items-start gap-2">
          <span>{errorLabel}</span>
          <Button variant="outline" size="xs" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';
  const hasAction = Boolean(message.pendingAction) || message.pendingStatus !== undefined;

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-muted text-foreground',
        )}
      >
        {isUser ? (
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
        ) : (
          <Markdown content={message.content} />
        )}
      </div>
      {!isUser && hasAction && (
        <div className="w-full max-w-[85%]">
          <PendingActionCard
            message={message}
            disabled={actionDisabled}
            onConfirm={onConfirmAction}
            onCancel={onCancelAction}
            labels={actionLabels}
          />
        </div>
      )}
    </div>
  );
}
