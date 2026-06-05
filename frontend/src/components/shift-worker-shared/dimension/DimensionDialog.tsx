'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function DimensionDialog({
  buttonContent,
  title,
  content,
  open,
  setOpen,
}: {
  buttonContent: React.ReactNode;
  title: string;
  content: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* trigger wrapper */}
      <span
        onClick={() => setOpen(true)}
        className="inline-block cursor-pointer border-none bg-transparent p-0 shadow-none hover:bg-transparent"
      >
        {buttonContent}
      </span>

      <DialogContent
        data-testid="new-dimension-dialog"
        className="p-5 sm:max-w-[350px]"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle data-testid="new-dimension-dialog-title">{title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              data-testid="new-dimension-dialog-close"
              className="h-auto p-0"
            >
              <X className="size-5" />
            </Button>
          </div>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
