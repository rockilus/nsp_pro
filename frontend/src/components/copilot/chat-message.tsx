'use client';

import { AlertCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { CopilotMessage } from '@/context/CopilotContext';
import Markdown from './markdown';

interface ChatMessageProps {
  message: CopilotMessage;
  errorLabel: string;
  retryLabel: string;
  onRetry: () => void;
}

export function ChatMessage({ message, errorLabel, retryLabel, onRetry }: ChatMessageProps) {
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

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
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
    </div>
  );
}
