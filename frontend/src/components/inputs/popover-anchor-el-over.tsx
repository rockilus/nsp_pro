'use client';

import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export default function PopoverAnchorElOver({
  buttonContent,
  content,
  open,
  setOpen,
}: {
  buttonContent: React.ReactNode;
  content: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="popover-trigger-button"
          className="flex h-full min-h-[20px] w-full cursor-pointer items-center justify-start border-none bg-transparent p-0 text-left shadow-none hover:bg-transparent"
        >
          {buttonContent}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        data-testid="popover-content"
        className="p-0 shadow-[0px_3px_5px_rgba(0,0,0,0.2)]"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
