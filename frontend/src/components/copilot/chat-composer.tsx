'use client';

import * as React from 'react';
import { SendHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatComposerProps {
  placeholder: string;
  sendLabel: string;
  disabled: boolean;
  onSend: (text: string) => void;
}

export function ChatComposer({ placeholder, sendLabel, disabled, onSend }: ChatComposerProps) {
  const [value, setValue] = React.useState('');

  const submit = React.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }, [value, disabled, onSend]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="max-h-40 min-h-10 flex-1 resize-none"
      />
      <Button
        type="button"
        size="icon"
        aria-label={sendLabel}
        disabled={disabled || value.trim().length === 0}
        onClick={submit}
      >
        <SendHorizontalIcon className="size-4" />
      </Button>
    </div>
  );
}
