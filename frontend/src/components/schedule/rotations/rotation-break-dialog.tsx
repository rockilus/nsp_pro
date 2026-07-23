'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { RotationBreakBehavior } from '@/types/rotation';

interface RotationBreakDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (behavior: RotationBreakBehavior) => void;
}

export default function RotationBreakDialog({
  lng,
  open,
  onClose,
  onConfirm,
}: RotationBreakDialogProps) {
  const { t } = useTranslation(lng, 'schedule-page');
  const [selectedBehavior, setSelectedBehavior] = useState<RotationBreakBehavior>(
    RotationBreakBehavior.CONTINUE,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('rotation_break_title')}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{t('rotation_break_on_edit')}</p>

        <RadioGroup
          value={String(selectedBehavior)}
          onValueChange={(value) => setSelectedBehavior(Number(value) as RotationBreakBehavior)}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value={String(RotationBreakBehavior.CONTINUE)} id="break-continue" />
            <Label htmlFor="break-continue">🔄 {t('rotation_break_continue')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value={String(RotationBreakBehavior.SWAP)} id="break-swap" />
            <Label htmlFor="break-swap">🔁 {t('rotation_break_swap')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value={String(RotationBreakBehavior.RESTART)} id="break-restart" />
            <Label htmlFor="break-restart">↩️ {t('rotation_break_restart')}</Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={() => onConfirm(selectedBehavior)}>{t('ok') || 'OK'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
