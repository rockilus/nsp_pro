'use client';

import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShiftT, ShiftType } from '../../types/shift';
import { ScheduleTemplateWeekDataDTO } from '../../types/schedule-template';
import { cn } from '@/lib/utils';

const WORK_SHIFT_TYPES: ShiftType[] = [ShiftType.NORMAL, ShiftType.DUTY, ShiftType.ON_CALL];

const SHIFT_TYPE_LABEL_KEY: Record<number, string> = {
  [ShiftType.NORMAL]: 'scope_normal_shifts',
  [ShiftType.DUTY]: 'scope_duty_shifts',
  [ShiftType.ON_CALL]: 'scope_on_call_shifts',
};

interface TemplateScopeDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  shifts: ShiftT[];
  scopeShiftIds: string[];
  includeAllWorkShifts: boolean;
  weeksData: ScheduleTemplateWeekDataDTO[];
  onSave: (includeAllWorkShifts: boolean, scopeShiftIds: string[]) => void;
}

export function TemplateScopeDialog({
  lng,
  open,
  onClose,
  shifts,
  scopeShiftIds,
  includeAllWorkShifts,
  weeksData,
  onSave,
}: TemplateScopeDialogProps) {
  const { t } = useTranslation(lng, 'schedule-templates');

  const pendingUncheckShiftId = useState<string | null>(null);
  const [warningShiftId, setWarningShiftId] = pendingUncheckShiftId;

  const workShifts = useMemo(
    () =>
      shifts
        .filter((s) => !s.deleted && WORK_SHIFT_TYPES.includes(s.shiftType))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [shifts],
  );

  const groupedShifts = useMemo(() => {
    const groups: Record<number, ShiftT[]> = {};
    for (const st of WORK_SHIFT_TYPES) {
      groups[st] = [];
    }
    for (const s of workShifts) {
      groups[s.shiftType].push(s);
    }
    return groups;
  }, [workShifts]);

  const populatedShiftIds = useMemo(() => {
    const ids = new Set<string>();
    for (const week of weeksData) {
      for (const entry of week.entries) {
        if (entry.demandCount > 0 || entry.workerIds.length > 0) {
          ids.add(entry.shiftId);
        }
      }
    }
    return ids;
  }, [weeksData]);

  const [localScope, setLocalScope] = useState<Set<string>>(new Set(scopeShiftIds));
  const [localIncludeAll, setLocalIncludeAll] = useState(includeAllWorkShifts);

  const allWorkShiftIds = useMemo(() => new Set(workShifts.map((s) => s.id)), [workShifts]);

  const isAllSelected = useMemo(
    () => workShifts.length > 0 && workShifts.every((s) => localScope.has(s.id)),
    [workShifts, localScope],
  );

  const handleToggleShift = (shiftId: string) => {
    setLocalScope((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        if (populatedShiftIds.has(shiftId)) {
          setWarningShiftId(shiftId);
          return prev;
        }
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  const handleConfirmUncheck = () => {
    if (!warningShiftId) return;
    setLocalScope((prev) => {
      const next = new Set(prev);
      next.delete(warningShiftId);
      return next;
    });
    setWarningShiftId(null);
  };

  const handleCancelUncheck = () => {
    setWarningShiftId(null);
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      const populatedRemaining = workShifts.filter((s) => populatedShiftIds.has(s.id));
      if (populatedRemaining.length > 0) {
        setWarningShiftId(populatedRemaining[0].id);
        return;
      }
      setLocalScope(new Set());
    } else {
      setLocalScope(new Set(workShifts.map((s) => s.id)));
    }
  };

  const handleSave = () => {
    onSave(localIncludeAll, Array.from(localScope));
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('scope_dialog_title')}</DialogTitle>
            <DialogDescription>{t('scope_dialog_description')}</DialogDescription>
          </DialogHeader>

          <label
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 transition-colors hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Checkbox
              checked={localIncludeAll}
              onCheckedChange={(v) => setLocalIncludeAll(v === true)}
              className="mt-0.5 shrink-0"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{t('scope_include_all_work_shifts')}</span>
              <span className="text-xs text-muted-foreground">
                {t('scope_include_all_work_shifts_description')}
              </span>
            </div>
          </label>

          {localIncludeAll ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              {t('scope_all_work_shifts_included')}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between py-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleToggleAll}>
                  {isAllSelected ? t('scope_deselect_all') : t('scope_select_all')}
                </Button>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {localScope.size}/{workShifts.length}
                </Badge>
              </div>

              {workShifts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('scope_no_work_shifts')}
                </p>
              ) : (
                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {WORK_SHIFT_TYPES.map((shiftType) => {
                    const groupShifts = groupedShifts[shiftType];
                    if (groupShifts.length === 0) return null;

                    return (
                      <div key={shiftType}>
                        <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                          {t(SHIFT_TYPE_LABEL_KEY[shiftType])}
                        </Label>
                        <div className="space-y-0.5">
                          {groupShifts.map((shift) => {
                            const isChecked = localScope.has(shift.id);
                            return (
                              <label
                                key={shift.id}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground',
                                  !isChecked && 'text-muted-foreground',
                                )}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleToggleShift(shift.id)}
                                  className="shrink-0"
                                />
                                <span className="flex-1 truncate text-sm">{shift.name}</span>
                                {populatedShiftIds.has(shift.id) && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 shrink-0 px-1 text-[10px]"
                                  >
                                    {t('demands')}
                                  </Badge>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave}>{t('scope_save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={warningShiftId !== null} onOpenChange={(v) => !v && handleCancelUncheck()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('scope_deselect_warning_title')}</DialogTitle>
            <DialogDescription>{t('scope_deselect_warning')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelUncheck}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmUncheck}>
              {t('scope_remove_shift')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
