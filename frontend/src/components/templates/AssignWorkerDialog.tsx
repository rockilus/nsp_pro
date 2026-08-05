'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { X, UserPlus } from 'lucide-react';
import { WorkerT } from '../../types/worker';

interface AssignWorkerDialogProps {
  lng: string;
  workers: WorkerT[];
  assignedWorkerIds: string[];
  open: boolean;
  onClose: () => void;
  onAddWorker: (workerId: string) => void;
  onRemoveWorker: (workerId: string) => void;
  shiftName: string;
  dayLabel: string;
}

export function AssignWorkerDialog({
  lng,
  workers,
  assignedWorkerIds,
  open,
  onClose,
  onAddWorker,
  onRemoveWorker,
  shiftName,
  dayLabel,
}: AssignWorkerDialogProps) {
  const { t } = useTranslation(lng, 'schedule-templates');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const assignedWorkers = workers.filter((w) => assignedWorkerIds.includes(w.id));

  const availableWorkers = workers
    .filter((w) => !w.deleted && !assignedWorkerIds.includes(w.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (open) {
      setSelectedWorkerId('');
    }
  }, [open]);

  const handleAdd = () => {
    if (!selectedWorkerId) return;
    onAddWorker(selectedWorkerId);
    setSelectedWorkerId('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {shiftName} — {dayLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('assigned_workers')}</Label>
            <div className="flex min-h-[2rem] flex-wrap gap-1.5 rounded-md border p-3">
              {assignedWorkers.length === 0 ? (
                <span className="text-xs text-muted-foreground">{t('no_workers_assigned')}</span>
              ) : (
                assignedWorkers.map((w) => (
                  <Badge
                    key={w.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1 text-xs"
                  >
                    {w.name}
                    <button
                      type="button"
                      className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                      onClick={() => onRemoveWorker(w.id)}
                      aria-label={t('remove')}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('select_worker')}</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('select_worker')} />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkers.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      {t('no_workers_assigned')}
                    </div>
                  ) : (
                    availableWorkers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleAdd} disabled={!selectedWorkerId}>
                <UserPlus className="mr-1 size-3.5" />
                {t('add')}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
