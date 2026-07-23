'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from '@/app/i18n/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, GripVertical } from 'lucide-react';
import { ShiftT } from '@/types/shift';
import { WorkerT } from '@/types/worker';
import {
  RotationT,
  RotationCreateDTO,
  RotationUpdateDTO,
  RotationBreakBehavior,
} from '@/types/rotation';

interface RotationManagementDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  teamId: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  rotations: RotationT[];
  initialShiftId?: string | null;
  initialDate?: dayjs.Dayjs | null;
  onCreate: (data: RotationCreateDTO) => void;
  onUpdate: (rotationId: string, data: RotationUpdateDTO) => void;
  onDelete: (rotationId: string) => void;
  isCreating: boolean;
  isUpdating: boolean;
}

export default function RotationManagementDialog({
  lng,
  open,
  onClose,
  teamId,
  shifts,
  workers,
  rotations,
  initialShiftId,
  initialDate,
  onCreate,
  onUpdate,
  onDelete,
  isCreating,
  isUpdating,
}: RotationManagementDialogProps) {
  const { t } = useTranslation(lng, 'schedule-page');

  const [editingRotationId, setEditingRotationId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shiftId, setShiftId] = useState<string>(initialShiftId || '');
  const [workerIds, setWorkerIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(initialDate || dayjs.utc());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const activeShifts = shifts.filter((s) => !s.deleted);
  const notDeletedWorkers = workers.filter((w) => !w.deleted);

  const resetForm = () => {
    setName('');
    setShiftId(initialShiftId || '');
    setWorkerIds([]);
    setStartDate(initialDate || dayjs.utc());
    setEndDate(null);
    setHasEndDate(false);
    setError(null);
    setEditingRotationId(null);
    setDeleteConfirmId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const startEditing = (rotation: RotationT) => {
    setEditingRotationId(rotation.id);
    setName(rotation.name);
    setShiftId(rotation.shiftId);
    setWorkerIds([...rotation.workerIds]);
    setStartDate(rotation.startDate);
    setEndDate(rotation.endDate);
    setHasEndDate(rotation.endDate !== null);
    setError(null);
    setDeleteConfirmId(null);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const addWorker = (workerId: string) => {
    if (workerId && !workerIds.includes(workerId)) {
      setWorkerIds([...workerIds, workerId]);
    }
  };

  const removeWorker = (index: number) => {
    setWorkerIds(workerIds.filter((_, i) => i !== index));
  };

  const moveWorker = (index: number, direction: 'up' | 'down') => {
    const newList = [...workerIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setWorkerIds(newList);
  };

  const handleSave = () => {
    setError(null);

    if (!name.trim()) {
      setError(t('rotation_name') + ' is required');
      return;
    }
    if (!shiftId) {
      setError(t('select_a_shift'));
      return;
    }
    if (workerIds.length < 2) {
      setError(t('rotation_min_workers'));
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }

    if (editingRotationId) {
      onUpdate(editingRotationId, {
        name: name.trim(),
        workerIds,
        startDate: startDate.startOf('day').unix(),
        endDate: hasEndDate && endDate ? endDate.startOf('day').unix() : null,
      });
    } else {
      onCreate({
        name: name.trim(),
        shiftId,
        workerIds,
        startDate: startDate.startOf('day').unix(),
        endDate: hasEndDate && endDate ? endDate.startOf('day').unix() : null,
      });
    }
  };

  const availableWorkers = notDeletedWorkers.filter((w) => !workerIds.includes(w.id));

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingRotationId ? t('edit_rotation') : t('new_rotation')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Rotation list (when not editing) */}
          {!editingRotationId && rotations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('rotations')}</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {rotations.map((rotation) => {
                  const shift = shifts.find((s) => s.id === rotation.shiftId);
                  return (
                    <div
                      key={rotation.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{rotation.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          {shift?.acronym || rotation.shiftId}
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          ({rotation.workerIds.length} {t('worker').toLocaleLowerCase()}s)
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEditing(rotation)}>
                          {t('edit') || 'Edit'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('rotation_name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('rotation_name_placeholder')}
            />
          </div>

          {/* Shift */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('shift')}</Label>
            <Select value={shiftId} onValueChange={setShiftId} disabled={!!editingRotationId}>
              <SelectTrigger>
                <SelectValue placeholder={t('select_a_shift')} />
              </SelectTrigger>
              <SelectContent>
                {activeShifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workers */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('rotation_workers')}</Label>
            <div className="space-y-1">
              {workerIds.map((workerId, index) => {
                const worker = notDeletedWorkers.find((w) => w.id === workerId);
                return (
                  <div
                    key={workerId}
                    className="flex items-center gap-1 rounded-md border px-2 py-1"
                  >
                    <span className="w-5 text-xs text-muted-foreground">{index + 1}.</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveWorker(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveWorker(index, 'down')}
                      disabled={index === workerIds.length - 1}
                    >
                      ↓
                    </Button>
                    <span className="flex-1 text-sm">{worker?.name || workerId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => removeWorker(index)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {availableWorkers.length > 0 && (
              <Select value="" onValueChange={addWorker}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('rotation_add_worker')} />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('rotation_start_date')}</Label>
            <DatePicker value={startDate} onChange={(d) => setStartDate(d)} className="w-full" />
          </div>

          {/* End date toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has-end-date"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
                className="size-4"
              />
              <Label htmlFor="has-end-date" className="text-sm font-medium">
                {t('rotation_end_date')}
              </Label>
            </div>
            {hasEndDate && (
              <DatePicker value={endDate} onChange={(d) => setEndDate(d)} className="w-full" />
            )}
          </div>
        </div>

        <DialogFooter>
          {editingRotationId && (
            <Button variant="destructive" onClick={() => setDeleteConfirmId(editingRotationId)}>
              {t('delete')}
            </Button>
          )}
          <Button variant="outline" onClick={handleCancelEdit}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isCreating || isUpdating}>
            {isCreating || isUpdating ? t('saving') : editingRotationId ? t('save') : t('create')}
          </Button>
        </DialogFooter>

        {/* Delete confirmation */}
        {deleteConfirmId && (
          <div className="mt-2 rounded-md border border-destructive/50 p-3 text-sm">
            <p className="mb-2 text-destructive">{t('rotation_delete_confirm')}</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                  resetForm();
                }}
              >
                {t('confirm')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
