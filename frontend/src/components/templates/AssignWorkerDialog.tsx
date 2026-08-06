'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { WorkerT } from '../../types/worker';

interface AssignWorkerDialogProps {
  lng: string;
  workers: WorkerT[];
  assignedWorkerIds: string[];
  open: boolean;
  onClose: () => void;
  onSave: (workerId: string) => void;
  onDelete: (workerId: string) => void;
  shiftName: string;
  dayLabel: string;
}

export function AssignWorkerDialog({
  lng,
  workers,
  assignedWorkerIds,
  open,
  onClose,
  onSave,
  onDelete,
  shiftName,
  dayLabel,
}: AssignWorkerDialogProps) {
  const { t } = useTranslation(lng, 'schedule-templates');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const activeWorkers = workers
    .filter((w) => !w.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));

  const isSelectedAlreadyAssigned = selectedWorkerId
    ? assignedWorkerIds.includes(selectedWorkerId)
    : false;

  useEffect(() => {
    if (open) {
      setSelectedWorkerId('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {shiftName} — {dayLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('select_worker')}</Label>
          <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
            <SelectTrigger>
              <SelectValue placeholder={t('select_worker')} />
            </SelectTrigger>
            <SelectContent>
              {activeWorkers.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  {t('no_workers_assigned')}
                </div>
              ) : (
                activeWorkers.map((w) => {
                  const isAssigned = assignedWorkerIds.includes(w.id);
                  return (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-1.5">
                        {w.name}
                        {isAssigned && <Check className="size-3.5 text-muted-foreground" />}
                      </span>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(selectedWorkerId);
              setSelectedWorkerId('');
            }}
            disabled={!isSelectedAlreadyAssigned}
          >
            {t('delete')}
          </Button>
          <Button
            onClick={() => {
              onSave(selectedWorkerId);
              setSelectedWorkerId('');
            }}
            disabled={!selectedWorkerId || isSelectedAlreadyAssigned}
          >
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
