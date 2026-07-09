'use client';

import * as React from 'react';
import { Loader2Icon, SparklesIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTranslation } from '@/app/i18n/client';
import { useCopilot } from '@/context/CopilotContext';
import { ChatMessage } from './chat-message';
import { ChatComposer } from './chat-composer';
import { SuggestionChips } from './suggestion-chips';

export function CopilotPanel({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'copilot');
  const { open, setOpen, messages, isLoading, send, retry, clear } = useCopilot();

  const bottomRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const rawChips = t('chips', { returnObjects: true });
  const chips = Array.isArray(rawChips) ? (rawChips as string[]) : [];
  const isEmpty = messages.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between border-b border-border pr-14">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            <SheetTitle className="text-base">{t('title')}</SheetTitle>
          </div>
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
        </SheetHeader>
        <SheetDescription className="sr-only">{t('description')}</SheetDescription>

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
      </SheetContent>
    </Sheet>
  );
}
