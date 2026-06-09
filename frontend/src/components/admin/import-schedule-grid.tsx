'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

dayjs.extend(utc);

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleGridAssignment {
  workerName: string;
  workerId: string;
  date: number;
  shiftCode: string;
  shiftId: string;
}

export interface ScheduleGridShift {
  acronym: string;
  color: string;
}

interface Props {
  assignments: ScheduleGridAssignment[];
  shifts: ScheduleGridShift[];
  workerLabel: string;
  /** Optional cell class name callback — useful for action-colored backgrounds */
  cellClassName?: (workerId: string, shiftId: string, date: number) => string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportScheduleGrid({
  assignments,
  shifts,
  workerLabel,
  cellClassName,
}: Props) {
  const grid: Record<string, Record<string, string[]>> = {};
  let minDate: dayjs.Dayjs | null = null;
  let maxDate: dayjs.Dayjs | null = null;

  for (const a of assignments) {
    const d = dayjs.unix(a.date).utc();
    if (!minDate || d.isBefore(minDate)) minDate = d;
    if (!maxDate || d.isAfter(maxDate)) maxDate = d;
    const dateKey = d.format('YYYY-MM-DD');
    if (!grid[a.workerName]) grid[a.workerName] = {};
    if (!grid[a.workerName][dateKey]) grid[a.workerName][dateKey] = [];
    grid[a.workerName][dateKey].push(a.shiftCode);
  }

  const workers = Object.keys(grid).sort();

  const initialMonth = minDate ? minDate.format('YYYY-MM') : '';
  const [scheduleMonth, setScheduleMonth] = useState(initialMonth);

  if (!minDate || !maxDate || workers.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No schedule data</p>;
  }

  const current = dayjs.utc(scheduleMonth + '-01');
  const monthStart = current.startOf('month');
  const monthEnd = current.endOf('month');
  const minMonthStart = minDate.startOf('month');
  const maxMonthStart = maxDate.startOf('month');

  const canPrev = monthStart.isAfter(minMonthStart);
  const canNext = monthStart.isBefore(maxMonthStart);

  const goPrev = () => setScheduleMonth(monthStart.subtract(1, 'month').format('YYYY-MM'));
  const goNext = () => setScheduleMonth(monthStart.add(1, 'month').format('YYYY-MM'));

  const days: dayjs.Dayjs[] = [];
  let cursor = monthStart;
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'day')) {
    days.push(cursor);
    cursor = cursor.add(1, 'day');
  }

  const monthLabel = monthStart.format('MMMM YYYY');

  // Build shift color lookup by acronym
  const shiftColorMap: Record<string, string> = {};
  for (const s of shifts) {
    shiftColorMap[s.acronym.toUpperCase()] = s.color;
  }

  // Build lookup for cell class names: (workerId, date) -> shiftId[]
  const cellDataMap: Record<string, Record<string, { shiftIds: string[]; workerId: string }>> = {};
  for (const a of assignments) {
    const dateKey = dayjs.unix(a.date).utc().format('YYYY-MM-DD');
    if (!cellDataMap[a.workerName]) cellDataMap[a.workerName] = {};
    if (!cellDataMap[a.workerName][dateKey]) {
      cellDataMap[a.workerName][dateKey] = { shiftIds: [], workerId: a.workerId };
    }
    cellDataMap[a.workerName][dateKey].shiftIds.push(a.shiftId);
    cellDataMap[a.workerName][dateKey].workerId = a.workerId;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={!canPrev}
          onClick={goPrev}
          data-testid="schedule-grid-prev-month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold" data-testid="schedule-grid-month-label">
          {monthLabel}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={!canNext}
          onClick={goNext}
          data-testid="schedule-grid-next-month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-[120px] border-r border-border/30 bg-card">
                {workerLabel}
              </TableHead>
              {days.map((d) => (
                <TableHead
                  key={d.toISOString()}
                  className="min-w-[40px] border-l border-border/30 text-center text-xs"
                >
                  {d.date()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((name) => {
              const row = grid[name] || {};
              const rowCellData = cellDataMap[name] || {};
              return (
                <TableRow key={name}>
                  <TableCell className="sticky left-0 z-10 border-r border-border/30 bg-card text-xs font-medium">
                    {name}
                  </TableCell>
                  {days.map((d) => {
                    const dateKey = d.format('YYYY-MM-DD');
                    const codes = row[dateKey];
                    const cellInfo = rowCellData[dateKey];
                    const extraClass =
                      cellInfo && cellClassName
                        ? cellClassName(cellInfo.workerId, cellInfo.shiftIds[0] || '', d.unix())
                        : '';

                    return (
                      <TableCell
                        key={dateKey}
                        className={`border-l border-border/30 p-0.5 text-center ${extraClass}`}
                      >
                        {codes && codes.length > 0 ? (
                          <div className="flex flex-wrap justify-center gap-0.5">
                            {codes.map((code, i) => (
                              <Badge
                                key={i}
                                style={{
                                  backgroundColor: shiftColorMap[code.toUpperCase()] || '#6B7280',
                                  color: '#fff',
                                }}
                                className="font-bold"
                              >
                                {code}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
