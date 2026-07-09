'use client';

import * as React from 'react';
import {
  ChevronUpIcon,
  Loader2Icon,
  MinusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/app/i18n/client';
import { useCopilot } from '@/context/CopilotContext';
import { ChatMessage } from './chat-message';
import { ChatComposer } from './chat-composer';
import { SuggestionChips } from './suggestion-chips';
import { buildActionLabels } from './action-labels';

export function CopilotWindow({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'copilot');
  const {
    open,
    setOpen,
    minimized,
    toggleMinimized,
    messages,
    isLoading,
    send,
    retry,
    clear,
    confirmAction,
    cancelAction,
  } = useCopilot();

  const actionLabels = buildActionLabels(t);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    // Jump instantly to the latest message when (re)opening; animate smoothly
    // for subsequent updates while the window stays open.
    const justOpened = !wasOpen.current;
    wasOpen.current = true;
    bottomRef.current?.scrollIntoView({ behavior: justOpened ? 'auto' : 'smooth' });
  }, [messages, isLoading, open]);

  const rawChips = t('chips', { returnObjects: true });
  const chips = Array.isArray(rawChips) ? (rawChips as string[]) : [];
  const isEmpty = messages.length === 0;

  if (!open) return null;

  const header = (
    <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{t('title')}</span>
      </div>
      <div className="flex items-center gap-0.5">
        {!isEmpty && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('clear')}
            onClick={clear}
            disabled={isLoading}
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label={t('minimize')} onClick={toggleMinimized}>
          <MinusIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('close')}
          onClick={() => setOpen(false)}
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );

  if (minimized) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={t('expand')}
        className="fixed right-4 bottom-4 z-50 flex w-[400px] cursor-pointer items-center gap-2 rounded-lg border border-border bg-popover px-4 py-2.5 shadow-lg"
        onClick={toggleMinimized}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggleMinimized();
        }}
      >
        <SparklesIcon className="size-4 shrink-0 text-primary" />
        <span className="flex-1 truncate text-sm font-medium text-foreground">{t('title')}</span>
        <ChevronUpIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex h-[600px] max-h-[calc(100vh-2rem)] w-[400px] flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
      {header}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isEmpty && !isLoading ? (
          <SuggestionChips
            title={t('emptyTitle')}
            hint={t('emptyHint')}
            chips={chips}
            onSelect={(prompt) => void send(prompt)}
          />
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              errorLabel={t('error')}
              retryLabel={t('retry')}
              onRetry={() => void retry()}
              actionDisabled={isLoading}
              onConfirmAction={() => void confirmAction(message.id)}
              onCancelAction={() => cancelAction(message.id)}
              actionLabels={actionLabels}
            />
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span>{t('loading')}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatComposer
        placeholder={t('placeholder')}
        sendLabel={t('send')}
        disabled={isLoading}
        onSend={(text) => void send(text)}
      />
    </div>
  );
}
