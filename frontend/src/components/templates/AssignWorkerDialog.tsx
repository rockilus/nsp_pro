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
import { WorkerT } from '../../types/worker';

interface AssignWorkerDialogProps {
  lng: string;
  workers: WorkerT[];
  assignedWorkerIds: string[];
  editWorkerId?: string;
  open: boolean;
  onClose: () => void;
  onSave: (workerId: string) => void;
  onDelete: (workerId: string) => void;
  shiftName: string;
  shiftAcronym: string;
  dayLabel: string;
  weekLabel: string;
}

export function AssignWorkerDialog({
  lng,
  workers,
  assignedWorkerIds,
  editWorkerId,
  open,
  onClose,
  onSave,
  onDelete,
  shiftName,
  shiftAcronym,
  dayLabel,
  weekLabel,
}: AssignWorkerDialogProps) {
  const { t } = useTranslation(lng, 'schedule-templates');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const activeWorkers = workers
    .filter((w) => !w.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));

  const isSelectedAlreadyAssigned = selectedWorkerId
    ? assignedWorkerIds.includes(selectedWorkerId)
    : false;

  const isEditMode = editWorkerId !== undefined;

  useEffect(() => {
    if (open) {
      setSelectedWorkerId(editWorkerId ?? '');
    }
  }, [open, editWorkerId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {shiftName} ({shiftAcronym})
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {dayLabel}, {weekLabel.toLowerCase()}
          </p>
        </DialogHeader>

        <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('select_worker')} />
          </SelectTrigger>
          <SelectContent>
            {activeWorkers.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                {t('no_workers_assigned')}
              </div>
            ) : (
              activeWorkers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <DialogFooter className="gap-2 sm:gap-2">
          {isEditMode && (
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(editWorkerId);
                setSelectedWorkerId('');
              }}
            >
              {t('delete')}
            </Button>
          )}
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
