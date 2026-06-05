'use client';

import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export default function PopoverAnchorElBelow({
  buttonContent,
  content,
  open,
  setOpen,
  testId,
}: {
  buttonContent: React.ReactNode;
  content: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  testId?: string;
}) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid={testId ? `${testId}-button` : undefined}
          className="flex cursor-pointer items-center justify-start border-none bg-transparent p-0 text-left shadow-none hover:bg-transparent"
        >
          {buttonContent}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        data-testid={testId ? `${testId}-popover` : undefined}
        className="w-[350px] p-5 shadow-[0px_3px_5px_rgba(0,0,0,0.2)]"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
