'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import CalendarRowHeaderCell from '../calendar/CalendarRowHeaderCell';
import { ShiftRowHeaderContent } from '../calendar/ShiftRowHeaderContent';
import { TemplateColumnHeader } from './TemplateColumnHeader';
import { TemplateCell } from './TemplateCell';
import { AssignWorkerDialog } from './AssignWorkerDialog';
import {
  ScheduleTemplateDTO,
  ScheduleTemplateEntryDTO,
  ScheduleTemplateWeekDataDTO,
  TemplateType,
} from '../../types/schedule-template';
import { ShiftT } from '../../types/shift';
import { TeamT } from '../../types/team';
import { WorkerT } from '../../types/worker';
import { calendarGridTemplate } from '../../constants/constants';

const MAX_VISIBLE_WEEKS = 4;
const DAYS_IN_WEEK = 7;

function getWeekLabel(
  weekNumber: number,
  templateType: TemplateType,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (templateType === TemplateType.EVEN_ODD) {
    return weekNumber === 0 ? t('even_week') : t('odd_week');
  }
  return t('week_number', { number: weekNumber + 1 });
}

function getShiftDemandTotalForVisibleWeeks(entries: ScheduleTemplateEntryDTO[]): number {
  return entries.reduce((sum, e) => sum + e.demandCount, 0);
}

interface TemplateShiftTableProps {
  lng: string;
  template: ScheduleTemplateDTO;
  shifts: ShiftT[];
  team: TeamT;
  workers: WorkerT[];
  onWeeksDataChange: (weeksData: ScheduleTemplateWeekDataDTO[]) => void;
  templateType: TemplateType;
  weeksData: ScheduleTemplateWeekDataDTO[];
  weekOffset: number;
  selectionEnabled: boolean;
  onToggleSelection?: () => void;
}

export function TemplateShiftTable({
  lng,
  template,
  shifts,
  team,
  workers,
  onWeeksDataChange,
  templateType,
  weeksData,
  weekOffset,
  selectionEnabled,
}: TemplateShiftTableProps) {
  const { t } = useTranslation(lng, 'schedule-templates');

  const visibleWeeks = useMemo(
    () => weeksData.slice(weekOffset, weekOffset + MAX_VISIBLE_WEEKS),
    [weeksData, weekOffset],
  );

  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [bulkDemandCount, setBulkDemandCount] = useState(1);
  const [assignDialogState, setAssignDialogState] = useState<{
    open: boolean;
    shiftId: string;
    weekNumber: number;
    dayOfWeek: number;
  }>({ open: false, shiftId: '', weekNumber: 0, dayOfWeek: 0 });

  const columns = useMemo(() => {
    const cols: { id: string; weekNumber: number; dayOfWeek: number }[] = [];
    for (const week of visibleWeeks) {
      for (let dayOfWeek = 0; dayOfWeek < DAYS_IN_WEEK; dayOfWeek++) {
        cols.push({
          id: `${week.weekNumber}-${dayOfWeek}`,
          weekNumber: week.weekNumber,
          dayOfWeek,
        });
      }
    }
    return cols;
  }, [visibleWeeks]);

  const rowShiftIds = useMemo(() => {
    return shifts
      .filter((s) => !s.deleted)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => s.id);
  }, [shifts]);

  const rows = useMemo(() => {
    return rowShiftIds
      .map((id) => shifts.find((s) => s.id === id))
      .filter((s): s is ShiftT => s !== undefined);
  }, [rowShiftIds, shifts]);

  const entryMap = useMemo(() => {
    const map = new Map<string, ScheduleTemplateEntryDTO | null>();
    for (const week of weeksData) {
      for (let dayOfWeek = 0; dayOfWeek < DAYS_IN_WEEK; dayOfWeek++) {
        for (const shiftId of rowShiftIds) {
          const entry =
            week.entries.find((e) => e.shiftId === shiftId && e.dayOfWeek === dayOfWeek) ?? null;
          map.set(`${shiftId}-${week.weekNumber}-${dayOfWeek}`, entry);
        }
      }
    }
    return map;
  }, [weeksData, rowShiftIds]);

  const shiftDemandTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const week of visibleWeeks) {
      for (const entry of week.entries) {
        const current = totals.get(entry.shiftId) ?? 0;
        totals.set(entry.shiftId, current + entry.demandCount);
      }
    }
    return totals;
  }, [visibleWeeks]);

  const toggleCell = useCallback((key: string) => {
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isCellSelected = useCallback(
    (rowId: string, colId: string) => {
      return selectedCells.has(`${rowId}-${colId}`);
    },
    [selectedCells],
  );

  const isRowSelected = useCallback(
    (rowId: string): boolean => {
      if (columns.length === 0) return false;
      return columns.every((col) => selectedCells.has(`${rowId}-${col.id}`));
    },
    [selectedCells, columns],
  );

  const isRowIndeterminate = useCallback(
    (rowId: string): boolean => {
      if (columns.length === 0) return false;
      const some = columns.some((col) => selectedCells.has(`${rowId}-${col.id}`));
      const all = columns.every((col) => selectedCells.has(`${rowId}-${col.id}`));
      return some && !all;
    },
    [selectedCells, columns],
  );

  const isColumnSelected = useCallback(
    (colId: string): boolean => {
      return rows.every((row) => selectedCells.has(`${row.id}-${colId}`));
    },
    [selectedCells, rows],
  );

  const isColumnIndeterminate = useCallback(
    (colId: string): boolean => {
      const some = rows.some((row) => selectedCells.has(`${row.id}-${colId}`));
      const all = rows.every((row) => selectedCells.has(`${row.id}-${colId}`));
      return some && !all;
    },
    [selectedCells, rows],
  );

  const isAllSelected = useMemo(() => {
    if (columns.length === 0 || rows.length === 0) return false;
    return columns.every((col) => rows.every((row) => selectedCells.has(`${row.id}-${col.id}`)));
  }, [selectedCells, columns, rows]);

  const isSomeSelected = useMemo(() => {
    return selectedCells.size > 0;
  }, [selectedCells]);

  const handleCellClick = useCallback(
    (shiftId: string, weekNumber: number, dayOfWeek: number) => {
      if (selectionEnabled) return;

      const newWeeks = weeksData.map((week) => {
        if (week.weekNumber !== weekNumber) return week;
        const otherEntries = week.entries.filter(
          (e) => !(e.shiftId === shiftId && e.dayOfWeek === dayOfWeek),
        );
        const existingEntry = week.entries.find(
          (e) => e.shiftId === shiftId && e.dayOfWeek === dayOfWeek,
        );
        if (existingEntry) {
          const newDemandCount = (existingEntry.demandCount + 1) % 3;
          if (newDemandCount > 0) {
            return {
              ...week,
              entries: [
                ...otherEntries,
                {
                  shiftId,
                  dayOfWeek,
                  demandCount: newDemandCount,
                  workerIds: existingEntry.workerIds,
                },
              ],
            };
          }
          return { ...week, entries: otherEntries };
        }
        return {
          ...week,
          entries: [...week.entries, { shiftId, dayOfWeek, demandCount: 1, workerIds: [] }],
        };
      });
      onWeeksDataChange(newWeeks);
    },
    [weeksData, selectionEnabled, onWeeksDataChange],
  );

  const handleAddDemand = useCallback(
    (shiftId: string, weekNumber: number, dayOfWeek: number) => {
      const newWeeks = weeksData.map((week) => {
        if (week.weekNumber !== weekNumber) return week;
        const existing = week.entries.find(
          (e) => e.shiftId === shiftId && e.dayOfWeek === dayOfWeek,
        );
        if (existing) return week;
        return {
          ...week,
          entries: [...week.entries, { shiftId, dayOfWeek, demandCount: 1, workerIds: [] }],
        };
      });
      onWeeksDataChange(newWeeks);
    },
    [weeksData, onWeeksDataChange],
  );

  const handleAddWorker = useCallback(
    (shiftId: string, weekNumber: number, dayOfWeek: number, workerId: string) => {
      const newWeeks = weeksData.map((week) => {
        if (week.weekNumber !== weekNumber) return week;
        const existing = week.entries.find(
          (e) => e.shiftId === shiftId && e.dayOfWeek === dayOfWeek,
        );
        const otherEntries = week.entries.filter(
          (e) => !(e.shiftId === shiftId && e.dayOfWeek === dayOfWeek),
        );
        if (existing) {
          return {
            ...week,
            entries: [
              ...otherEntries,
              {
                ...existing,
                workerIds: [...existing.workerIds, workerId],
              },
            ],
          };
        }
        return {
          ...week,
          entries: [...week.entries, { shiftId, dayOfWeek, demandCount: 0, workerIds: [workerId] }],
        };
      });
      onWeeksDataChange(newWeeks);
    },
    [weeksData, onWeeksDataChange],
  );

  const handleRemoveWorker = useCallback(
    (shiftId: string, weekNumber: number, dayOfWeek: number, workerId: string) => {
      const newWeeks = weeksData.map((week) => {
        if (week.weekNumber !== weekNumber) return week;
        const existing = week.entries.find(
          (e) => e.shiftId === shiftId && e.dayOfWeek === dayOfWeek,
        );
        if (!existing) return week;
        const updatedWorkerIds = existing.workerIds.filter((id) => id !== workerId);
        if (updatedWorkerIds.length === 0 && existing.demandCount === 0) {
          return {
            ...week,
            entries: week.entries.filter(
              (e) => !(e.shiftId === shiftId && e.dayOfWeek === dayOfWeek),
            ),
          };
        }
        return {
          ...week,
          entries: [
            ...week.entries.filter((e) => !(e.shiftId === shiftId && e.dayOfWeek === dayOfWeek)),
            { ...existing, workerIds: updatedWorkerIds },
          ],
        };
      });
      onWeeksDataChange(newWeeks);
    },
    [weeksData, onWeeksDataChange],
  );

  const handleOpenAssignDialog = useCallback(
    (shiftId: string, weekNumber: number, dayOfWeek: number) => {
      setAssignDialogState({ open: true, shiftId, weekNumber, dayOfWeek });
    },
    [],
  );

  const handleCloseAssignDialog = useCallback(() => {
    setAssignDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleCellSelectToggle = useCallback(
    (rowId: string, colId: string) => {
      toggleCell(`${rowId}-${colId}`);
    },
    [toggleCell],
  );

  const handleRowSelect = useCallback(
    (rowId: string) => {
      setSelectedCells((prev) => {
        const next = new Set(prev);
        const rowAllSelected = columns.every((col) => prev.has(`${rowId}-${col.id}`));
        for (const col of columns) {
          const key = `${rowId}-${col.id}`;
          if (rowAllSelected) {
            next.delete(key);
          } else {
            next.add(key);
          }
        }
        return next;
      });
    },
    [columns],
  );

  const handleColumnSelect = useCallback(
    (colId: string) => {
      setSelectedCells((prev) => {
        const next = new Set(prev);
        const colAllSelected = rows.every((row) => prev.has(`${row.id}-${colId}`));
        for (const row of rows) {
          const key = `${row.id}-${colId}`;
          if (colAllSelected) {
            next.delete(key);
          } else {
            next.add(key);
          }
        }
        return next;
      });
    },
    [rows],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedCells((prev) => {
      if (isAllSelected) {
        return new Set();
      }
      const next = new Set<string>();
      for (const row of rows) {
        for (const col of columns) {
          next.add(`${row.id}-${col.id}`);
        }
      }
      return next;
    });
  }, [isAllSelected, rows, columns]);

  const handleBulkClearSelected = useCallback(() => {
    const newWeeks = weeksData.map((week) => {
      const newEntries = week.entries.filter((entry) => {
        const key = `${entry.shiftId}-${week.weekNumber}-${entry.dayOfWeek}`;
        return !selectedCells.has(key);
      });
      return { ...week, entries: newEntries };
    });
    onWeeksDataChange(newWeeks);
    setSelectedCells(new Set());
  }, [weeksData, selectedCells, onWeeksDataChange]);

  const handleBulkSetDemand = useCallback(() => {
    const newWeeks = weeksData.map((week) => {
      const newEntries = [...week.entries];
      for (const cellKey of selectedCells) {
        const parts = cellKey.split('-');
        const weekNum = parseInt(parts[0], 10);
        const dayOfWeek = parseInt(parts[1], 10);
        const shiftId = parts.slice(2).join('-');

        if (week.weekNumber !== weekNum) continue;

        const idx = newEntries.findIndex((e) => e.shiftId === shiftId && e.dayOfWeek === dayOfWeek);
        if (idx >= 0) {
          if (bulkDemandCount > 0) {
            newEntries[idx] = { ...newEntries[idx], demandCount: bulkDemandCount };
          } else {
            newEntries.splice(idx, 1);
          }
        } else if (bulkDemandCount > 0) {
          newEntries.push({
            shiftId,
            dayOfWeek,
            demandCount: bulkDemandCount,
            workerIds: [],
          });
        }
      }
      return { ...week, entries: newEntries };
    });
    onWeeksDataChange(newWeeks);
    setSelectedCells(new Set());
  }, [weeksData, selectedCells, bulkDemandCount, onWeeksDataChange]);

  const numColumns = visibleWeeks.length * DAYS_IN_WEEK;
  const weekLabels = visibleWeeks.map((w) => ({
    weekNumber: w.weekNumber,
    label: getWeekLabel(w.weekNumber, templateType, t),
  }));

  const assignDialogEntry = useMemo(
    () =>
      entryMap.get(
        `${assignDialogState.shiftId}-${assignDialogState.weekNumber}-${assignDialogState.dayOfWeek}`,
      ) ?? null,
    [entryMap, assignDialogState],
  );

  const assignDialogShift = useMemo(
    () => shifts.find((s) => s.id === assignDialogState.shiftId) ?? null,
    [shifts, assignDialogState.shiftId],
  );

  const assignDialogDayLabel = useMemo(() => {
    const dayKeys = [
      'monday_short',
      'tuesday_short',
      'wednesday_short',
      'thursday_short',
      'friday_short',
      'saturday_short',
      'sunday_short',
    ];
    return t(dayKeys[assignDialogState.dayOfWeek] ?? '');
  }, [t, assignDialogState.dayOfWeek]);

  return (
    <div className="flex h-full flex-col">
      {selectionEnabled && selectedCells.size > 0 && (
        <div className="flex items-center gap-2 border-b bg-accent/30 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">
            {t('cells_selected', { count: selectedCells.size })}
          </span>
          <Input
            type="number"
            min={0}
            max={99}
            value={bulkDemandCount}
            onChange={(e) => setBulkDemandCount(parseInt(e.target.value, 10) || 0)}
            className="h-7 w-16 text-xs"
          />
          <Button size="sm" variant="outline" className="text-xs" onClick={handleBulkSetDemand}>
            {t('set_demand')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-destructive hover:text-destructive"
            onClick={handleBulkClearSelected}
          >
            {t('clear_selected')}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto" data-testid="template-shift-table">
        <TemplateColumnHeader
          lng={lng}
          weeks={weekLabels}
          rowHeaderLabel={t('shift')}
          selectionEnabled={selectionEnabled}
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
          onSelectAll={handleSelectAll}
          isColumnSelected={isColumnSelected}
          isColumnIndeterminate={isColumnIndeterminate}
          onColumnSelect={handleColumnSelect}
        />

        {rows.map((shift) => {
          const demandTotal = shiftDemandTotals.get(shift.id) ?? 0;
          return (
            <div
              key={shift.id}
              className="border-b border-border/50"
              style={{
                display: 'grid',
                gridTemplateColumns: calendarGridTemplate(numColumns),
              }}
            >
              <CalendarRowHeaderCell
                data-testid={`template-row-header-${shift.id}`}
                isBulkMode={selectionEnabled}
                isSelected={isRowSelected(shift.id)}
                isIndeterminate={isRowIndeterminate(shift.id)}
                onSelect={() => handleRowSelect(shift.id)}
                checkboxTestId={`template-row-checkbox-${shift.id}`}
                className="py-1"
              >
                <ShiftRowHeaderContent
                  lng={lng}
                  team={team}
                  shift={shift}
                  showStats={false}
                  shiftCountActual={getShiftDemandTotalForVisibleWeeks(
                    visibleWeeks.flatMap((w) => w.entries.filter((e) => e.shiftId === shift.id)),
                  )}
                  shiftCountTarget={0}
                />
              </CalendarRowHeaderCell>

              {columns.map((col) => {
                const entry =
                  entryMap.get(`${shift.id}-${col.weekNumber}-${col.dayOfWeek}`) ?? null;
                const cellKey = `${shift.id}-${col.id}`;
                return (
                  <TemplateCell
                    key={col.id}
                    entry={entry}
                    isWeekend={col.dayOfWeek === 5 || col.dayOfWeek === 6}
                    isSelected={isCellSelected(shift.id, col.id)}
                    selectionEnabled={selectionEnabled}
                    onClick={() => handleCellClick(shift.id, col.weekNumber, col.dayOfWeek)}
                    onSelectToggle={() => handleCellSelectToggle(shift.id, col.id)}
                    onAddDemand={() => handleAddDemand(shift.id, col.weekNumber, col.dayOfWeek)}
                    onAssignWorker={() =>
                      handleOpenAssignDialog(shift.id, col.weekNumber, col.dayOfWeek)
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <AssignWorkerDialog
        lng={lng}
        workers={workers}
        assignedWorkerIds={assignDialogEntry?.workerIds ?? []}
        open={assignDialogState.open}
        onClose={handleCloseAssignDialog}
        onAddWorker={(workerId) => {
          handleAddWorker(
            assignDialogState.shiftId,
            assignDialogState.weekNumber,
            assignDialogState.dayOfWeek,
            workerId,
          );
        }}
        onRemoveWorker={(workerId) => {
          handleRemoveWorker(
            assignDialogState.shiftId,
            assignDialogState.weekNumber,
            assignDialogState.dayOfWeek,
            workerId,
          );
        }}
        shiftName={assignDialogShift?.name ?? ''}
        dayLabel={assignDialogDayLabel}
      />
    </div>
  );
}
