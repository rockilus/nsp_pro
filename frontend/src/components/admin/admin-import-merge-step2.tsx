'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Calendar, Search, TriangleAlert } from 'lucide-react';
import {
  type MergeAction,
  type MergeTargetWorker,
  type MergeTargetShift,
  type MergeTargetsResponse,
  type WorkerMergeMapping,
  type ShiftMergeMapping,
  type RequestMergeMapping,
  type AssignmentMergeConfig,
  buildValidWorkerGids,
  buildValidShiftGids,
  countEffectiveAssignments,
} from '@/app/lib/import-merge-utils';
import ImportScheduleGrid from './import-schedule-grid';
import ImportMergeFullTableDialog from './import-merge-full-table-dialog';

dayjs.extend(utc);

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportMember {
  generatedId: string;
  name: string;
  acronym: string;
  employmentStartDate: number;
  employmentEndDate: number | null;
  weeklyHours: number;
  weeklyHoursDesired: number;
  dutiesPerMonth: number;
  annualLeave: number;
  specialtyIds: string[];
  warnings: string[];
}

interface ImportShift {
  generatedId: string;
  name: string;
  acronym: string;
  shiftType: number;
  startTime: number;
  endTime: number;
  color: string;
  duty: boolean;
  mandatoryRest: boolean;
  warnings: string[];
}

interface ImportRequest {
  generatedId: string;
  workerName: string;
  workerId: string;
  startDate: number;
  endDate: number;
  shiftCode: string;
  status: string;
  warnings: string[];
}

interface ImportAssignment {
  generatedId: string;
  workerName: string;
  workerId: string;
  date: number;
  shiftCode: string;
  shiftId: string;
}

interface Props {
  lng: string;
  members: ImportMember[];
  shifts: ImportShift[];
  requests: ImportRequest[];
  assignments: ImportAssignment[];
  targets: MergeTargetsResponse;
  workerMappings: WorkerMergeMapping[];
  shiftMappings: ShiftMergeMapping[];
  requestMappings: RequestMergeMapping[];
  assignmentConfig: AssignmentMergeConfig;
  selectedTeamId: string | null;
  onWorkerMappingsChange: (mappings: WorkerMergeMapping[]) => void;
  onShiftMappingsChange: (mappings: ShiftMergeMapping[]) => void;
  onRequestMappingsChange: (mappings: RequestMergeMapping[]) => void;
  onAssignmentConfigChange: (config: AssignmentMergeConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function unixToDateStr(ts: number): string {
  return dayjs.unix(ts).utc().format('YYYY-MM-DD');
}

function shiftTypeLabel(t: number, tFn: (key: string) => string): string {
  switch (t) {
    case 0:
      return tFn('normal');
    case 1:
      return tFn('duty');
    case 2:
      return 'Rest';
    case 3:
      return tFn('leave_type');
    default:
      return String(t);
  }
}

/** Map merge action to a light background class name for table rows/cells */
const ACTION_BG: Record<MergeAction, string> = {
  add_new: 'bg-green-100 dark:bg-green-900/30',
  merge_into: 'bg-orange-100 dark:bg-orange-900/30',
  skip: 'bg-red-100 dark:bg-red-900/30',
};

/** Background for assignments outside the date filter range */
const OUT_OF_RANGE_BG = 'bg-gray-200 dark:bg-gray-800/50 opacity-60';

const ACTION_OPTIONS: { value: MergeAction; labelKey: string }[] = [
  { value: 'add_new', labelKey: 'action_add_new' },
  { value: 'merge_into', labelKey: 'action_merge_into' },
  { value: 'skip', labelKey: 'action_skip' },
];

// ── Assignment helpers for schedule grid cell coloring ──
function getWorkerAction(
  workerId: string,
  workerMappings: WorkerMergeMapping[],
): MergeAction | null {
  const m = workerMappings.find((w) => w.generatedId === workerId);
  return m?.action ?? null;
}

function getShiftAction(shiftId: string, shiftMappings: ShiftMergeMapping[]): MergeAction | null {
  const m = shiftMappings.find((s) => s.generatedId === shiftId);
  return m?.action ?? null;
}

/** Check if a date falls outside the active period filter */
function isOutOfRange(date: number, config: AssignmentMergeConfig): boolean {
  if (config.includeAll) return false;
  if (config.startDate != null && date < config.startDate) return true;
  if (config.endDate != null && date > config.endDate) return true;
  return false;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminImportMergeStep2({
  lng,
  members,
  shifts,
  requests,
  assignments,
  targets,
  workerMappings,
  shiftMappings,
  requestMappings,
  assignmentConfig,
  selectedTeamId,
  onWorkerMappingsChange,
  onShiftMappingsChange,
  onRequestMappingsChange,
  onAssignmentConfigChange,
  onBack,
  onNext,
}: Props) {
  const { t } = useTranslation(lng, 'admin-import');

  // Dialog state
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [shiftsDialogOpen, setShiftsDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Mapping lookups
  const workerMap = useMemo(
    () => new Map(workerMappings.map((m) => [m.generatedId, m])),
    [workerMappings],
  );
  const shiftMap = useMemo(
    () => new Map(shiftMappings.map((m) => [m.generatedId, m])),
    [shiftMappings],
  );

  const validWorkers = useMemo(() => buildValidWorkerGids(workerMappings), [workerMappings]);
  const validShifts = useMemo(() => buildValidShiftGids(shiftMappings), [shiftMappings]);

  const effectiveAssignments = useMemo(
    () => countEffectiveAssignments(assignments, validWorkers, validShifts, assignmentConfig),
    [assignments, validWorkers, validShifts, assignmentConfig],
  );

  // Grid assignments: show ALL assignments (no date filtering, no cascade filtering)
  // Background colors will distinguish included / excluded / out-of-range
  const gridAssignments = useMemo(() => assignments, [assignments]);

  // Compute date range from imported assignments for the existing schedule dialog
  // (constrained to ≤ 365 days to match backend limit)
  const scheduleDateRange = useMemo(() => {
    if (assignments.length === 0) return { start: null, end: null };
    let min = Infinity;
    let max = -Infinity;
    for (const a of assignments) {
      if (a.date < min) min = a.date;
      if (a.date > max) max = a.date;
    }
    // Clamp to max 365 days
    const minDay = dayjs.unix(min).utc();
    const maxDay = dayjs.unix(max).utc();
    // Expand by 7 days on each side for context, but cap at 365 total
    const rangeStart = minDay.subtract(7, 'day');
    const rangeEnd = maxDay.add(7, 'day');
    const totalDays = rangeEnd.diff(rangeStart, 'day');
    if (totalDays > 365) {
      // Center the 365-day window around the data midpoint
      const mid = dayjs.unix((min + max) / 2).utc();
      return {
        start: mid.subtract(182, 'day').startOf('day').unix(),
        end: mid.add(182, 'day').startOf('day').unix(),
      };
    }
    return { start: rangeStart.startOf('day').unix(), end: rangeEnd.startOf('day').unix() };
  }, [assignments]);

  // ── Worker mapping handler ──
  const handleWorkerAction = useCallback(
    (generatedId: string, action: MergeAction) => {
      const next = workerMappings.map((m) =>
        m.generatedId === generatedId
          ? { ...m, action, targetWorkerId: action === 'merge_into' ? m.targetWorkerId : null }
          : m,
      );
      onWorkerMappingsChange(next);
    },
    [workerMappings, onWorkerMappingsChange],
  );

  const handleWorkerTarget = useCallback(
    (generatedId: string, targetWorkerId: string) => {
      const next = workerMappings.map((m) =>
        m.generatedId === generatedId ? { ...m, targetWorkerId } : m,
      );
      onWorkerMappingsChange(next);
    },
    [workerMappings, onWorkerMappingsChange],
  );

  // ── Shift mapping handler ──
  const handleShiftAction = useCallback(
    (generatedId: string, action: MergeAction) => {
      const next = shiftMappings.map((m) =>
        m.generatedId === generatedId
          ? { ...m, action, targetShiftId: action === 'merge_into' ? m.targetShiftId : null }
          : m,
      );
      onShiftMappingsChange(next);
    },
    [shiftMappings, onShiftMappingsChange],
  );

  const handleShiftTarget = useCallback(
    (generatedId: string, targetShiftId: string) => {
      const next = shiftMappings.map((m) =>
        m.generatedId === generatedId ? { ...m, targetShiftId } : m,
      );
      onShiftMappingsChange(next);
    },
    [shiftMappings, onShiftMappingsChange],
  );

  // ── Request mapping handler ──
  const handleRequestAction = useCallback(
    (generatedId: string, action: MergeAction) => {
      const next = requestMappings.map((m) =>
        m.generatedId === generatedId ? { ...m, action } : m,
      );
      onRequestMappingsChange(next);
    },
    [requestMappings, onRequestMappingsChange],
  );

  // ── Assignment config handler ──
  const handleIncludeAll = useCallback(() => {
    onAssignmentConfigChange({
      ...assignmentConfig,
      includeAll: true,
      startDate: null,
      endDate: null,
    });
  }, [assignmentConfig, onAssignmentConfigChange]);

  const handleDateFilter = useCallback(
    (field: 'startDate' | 'endDate', value: string) => {
      const ts = value ? dayjs.utc(value).startOf('day').unix() : null;
      onAssignmentConfigChange({ ...assignmentConfig, includeAll: false, [field]: ts });
    },
    [assignmentConfig, onAssignmentConfigChange],
  );

  // ── Schedule grid cell color callback ──
  // Returns a class based on: skip > out-of-range > merge_into > add_new
  const scheduleCellClass = useCallback(
    (workerId: string, shiftId: string, date: number) => {
      const wAction = getWorkerAction(workerId, workerMappings);
      const sAction = getShiftAction(shiftId, shiftMappings);
      // If either is skip, the assignment is cascaded out — show skip style
      if (wAction === 'skip' || sAction === 'skip') return ACTION_BG.skip;
      // If outside the date filter range, show out-of-range style
      if (isOutOfRange(date, assignmentConfig)) return OUT_OF_RANGE_BG;
      // If merging, show merge style
      if (wAction === 'merge_into' || sAction === 'merge_into') return ACTION_BG.merge_into;
      return ACTION_BG.add_new;
    },
    [workerMappings, shiftMappings, assignmentConfig],
  );

  // ── Derivations for legend ──
  const showOutOfRangeLegend = !assignmentConfig.includeAll;

  // ── Render ─────────────────────────────────────────────────────────────

  // Color legend inline
  const legendEl = (
    <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-green-400" />
        {t('legend_added') || 'Added'}
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-orange-400" />
        {t('legend_merged') || 'Merged'}
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-red-400" />
        {t('legend_skipped') || 'Skipped'}
      </span>
      {showOutOfRangeLegend && (
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-gray-400" />
          {t('legend_out_of_range') || 'Out of range'}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {legendEl}

      {/* Workers */}
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Badge variant="default">{members.length}</Badge>
            <h2 className="text-sm font-semibold">{t('members_tab')}</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMembersDialogOpen(true)}>
            <Search className="mr-1 size-3.5" />
            {t('view_full_details') || 'View full details'}
          </Button>
        </div>
        <div className="p-3">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('code')}</TableHead>
                  <TableHead>{t('action_add_new') || 'Action'}</TableHead>
                  <TableHead>{t('target_worker') || 'Target'}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const mapping = workerMap.get(m.generatedId);
                  const action = mapping?.action || 'add_new';
                  return (
                    <TableRow
                      key={m.generatedId}
                      data-testid={`merge-worker-row-${m.generatedId}`}
                      className={ACTION_BG[action]}
                    >
                      <TableCell className="text-sm">{m.name}</TableCell>
                      <TableCell className="font-mono text-xs">{m.acronym}</TableCell>
                      <TableCell>
                        <Select
                          value={action}
                          onValueChange={(v) => handleWorkerAction(m.generatedId, v as MergeAction)}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(opt.labelKey) || opt.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {action === 'merge_into' && (
                          <Select
                            value={mapping?.targetWorkerId || ''}
                            onValueChange={(v) => handleWorkerTarget(m.generatedId, v)}
                          >
                            <SelectTrigger className="h-8 w-44">
                              <SelectValue placeholder={t('target_worker') || 'Select worker...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {targets.workers.map((tw: MergeTargetWorker) => (
                                <SelectItem key={tw.id} value={tw.id}>
                                  {tw.name} ({tw.acronym})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.warnings.length > 0 && (
                          <TriangleAlert className="size-4 shrink-0 text-amber-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Shifts */}
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Badge variant="default">{shifts.length}</Badge>
            <h2 className="text-sm font-semibold">{t('shifts_tab')}</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShiftsDialogOpen(true)}>
            <Search className="mr-1 size-3.5" />
            {t('view_full_details') || 'View full details'}
          </Button>
        </div>
        <div className="p-3">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">{t('color')}</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('code')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('action_add_new') || 'Action'}</TableHead>
                  <TableHead>{t('target_shift') || 'Target'}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => {
                  const mapping = shiftMap.get(s.generatedId);
                  const action = mapping?.action || 'add_new';
                  return (
                    <TableRow
                      key={s.generatedId}
                      data-testid={`merge-shift-row-${s.generatedId}`}
                      className={ACTION_BG[action]}
                    >
                      <TableCell>
                        <div
                          className="size-4 rounded-full border border-border/50"
                          style={{ backgroundColor: s.color }}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{s.name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.acronym}</TableCell>
                      <TableCell className="text-xs">{shiftTypeLabel(s.shiftType, t)}</TableCell>
                      <TableCell>
                        <Select
                          value={action}
                          onValueChange={(v) => handleShiftAction(s.generatedId, v as MergeAction)}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(opt.labelKey) || opt.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {action === 'merge_into' && (
                          <Select
                            value={mapping?.targetShiftId || ''}
                            onValueChange={(v) => handleShiftTarget(s.generatedId, v)}
                          >
                            <SelectTrigger className="h-8 w-44">
                              <SelectValue placeholder={t('target_shift') || 'Select shift...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {targets.shifts.map((ts: MergeTargetShift) => (
                                <SelectItem key={ts.id} value={ts.id}>
                                  {ts.name} ({ts.acronym})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.warnings.length > 0 && (
                          <TriangleAlert className="size-4 shrink-0 text-amber-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Requests */}
      {requests.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <Badge variant="default">{requests.length}</Badge>
            <h2 className="text-sm font-semibold">{t('requests_tab')}</h2>
          </div>
          <div className="p-3">
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('worker')}</TableHead>
                    <TableHead>{t('start_date')}</TableHead>
                    <TableHead>{t('end_date')}</TableHead>
                    <TableHead>{t('shift')}</TableHead>
                    <TableHead>{t('action_add_new') || 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const mapping = requestMappings.find((rm) => rm.generatedId === r.generatedId);
                    const action = mapping?.action || 'add_new';
                    const isCascadedSkip = !validWorkers.has(r.workerId);

                    return (
                      <TableRow
                        key={r.generatedId}
                        className={
                          isCascadedSkip
                            ? `${ACTION_BG.skip} text-muted-foreground line-through`
                            : ACTION_BG[action]
                        }
                        data-testid={`merge-request-row-${r.generatedId}`}
                      >
                        <TableCell className="text-sm">{r.workerName}</TableCell>
                        <TableCell className="text-xs">{unixToDateStr(r.startDate)}</TableCell>
                        <TableCell className="text-xs">{unixToDateStr(r.endDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.shiftCode}</TableCell>
                        <TableCell>
                          {isCascadedSkip ? (
                            <span
                              className="text-xs text-muted-foreground"
                              title="Worker was skipped"
                            >
                              {t('cascade_skipped') || 'Skipped (cascade)'}
                            </span>
                          ) : (
                            <Select
                              value={action}
                              onValueChange={(v) =>
                                handleRequestAction(r.generatedId, v as MergeAction)
                              }
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="add_new">
                                  {t('action_add_new') || 'Add new'}
                                </SelectItem>
                                <SelectItem value="skip">{t('action_skip') || 'Skip'}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      )}

      {/* Assignments config + schedule grid */}
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Badge variant="default">{effectiveAssignments}</Badge>
            <h2 className="text-sm font-semibold">{t('schedule_tab')}</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleDialogOpen(true)}
            data-testid="merge-view-existing-schedule"
          >
            <Calendar className="mr-1 size-3.5" />
            {t('view_existing_schedule') || 'View Existing Schedule'}
          </Button>
        </div>
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-3">
            <Label className="flex items-center gap-2">
              <input
                type="radio"
                name="assignmentMode"
                checked={assignmentConfig.includeAll}
                onChange={handleIncludeAll}
                className="size-4"
                data-testid="merge-assignments-include-all"
              />
              <span className="text-sm">{t('include_all') || 'Include all assignments'}</span>
            </Label>
            <Label className="flex items-center gap-2">
              <input
                type="radio"
                name="assignmentMode"
                checked={!assignmentConfig.includeAll}
                onChange={() =>
                  onAssignmentConfigChange({ ...assignmentConfig, includeAll: false })
                }
                className="size-4"
                data-testid="merge-assignments-filter-period"
              />
              <span className="text-sm">{t('filter_by_period') || 'Filter by period'}</span>
            </Label>
          </div>

          {!assignmentConfig.includeAll && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">{t('start_date')}</Label>
                <Input
                  type="date"
                  className="h-8 w-40"
                  data-testid="merge-period-start"
                  value={
                    assignmentConfig.startDate
                      ? dayjs.unix(assignmentConfig.startDate).utc().format('YYYY-MM-DD')
                      : ''
                  }
                  onChange={(e) => handleDateFilter('startDate', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">{t('end_date')}</Label>
                <Input
                  type="date"
                  className="h-8 w-40"
                  data-testid="merge-period-end"
                  value={
                    assignmentConfig.endDate
                      ? dayjs.unix(assignmentConfig.endDate).utc().format('YYYY-MM-DD')
                      : ''
                  }
                  onChange={(e) => handleDateFilter('endDate', e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground" data-testid="merge-assignment-count">
                {effectiveAssignments} assignment(s) in range
              </span>
            </div>
          )}

          {/* Schedule grid — always show all assignments */}
          {gridAssignments.length > 0 && (
            <div className="pt-2">
              <ImportScheduleGrid
                assignments={gridAssignments}
                shifts={shifts.map((s) => ({ acronym: s.acronym, color: s.color }))}
                workerLabel={t('worker')}
                cellClassName={scheduleCellClass}
              />
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="merge-step2-back">
          <ArrowLeft className="mr-1.5 size-4" />
          {t('back_to_list')}
        </Button>

        <Button size="sm" onClick={onNext} data-testid="merge-step2-next">
          {t('merge_step3_title') || 'Next: Confirm'}
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </div>

      {/* Full table dialogs */}
      <ImportMergeFullTableDialog
        lng={lng}
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        type="members"
        teamId={selectedTeamId}
        importedMembers={members.map((m) => ({
          generatedId: m.generatedId,
          name: m.name,
          acronym: m.acronym,
          employmentStartDate: m.employmentStartDate,
          employmentEndDate: m.employmentEndDate,
          weeklyHours: m.weeklyHours,
          weeklyHoursDesired: m.weeklyHoursDesired,
          dutiesPerMonth: m.dutiesPerMonth,
          annualLeave: m.annualLeave,
          specialtyIds: m.specialtyIds,
        }))}
      />

      <ImportMergeFullTableDialog
        lng={lng}
        open={shiftsDialogOpen}
        onOpenChange={setShiftsDialogOpen}
        type="shifts"
        teamId={selectedTeamId}
        importedShifts={shifts.map((s) => ({
          generatedId: s.generatedId,
          name: s.name,
          acronym: s.acronym,
          shiftType: s.shiftType,
          startTime: s.startTime,
          endTime: s.endTime,
          color: s.color,
          duty: s.duty,
          mandatoryRest: s.mandatoryRest,
        }))}
      />

      {/* Existing schedule dialog */}
      <ImportMergeFullTableDialog
        lng={lng}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        type="schedule"
        teamId={selectedTeamId}
        importedShiftDefs={shifts.map((s) => ({ acronym: s.acronym, color: s.color }))}
        scheduleStartDate={scheduleDateRange.start}
        scheduleEndDate={scheduleDateRange.end}
      />
    </div>
  );
}
