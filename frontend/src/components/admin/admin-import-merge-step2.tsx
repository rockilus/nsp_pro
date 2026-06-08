'use client';

import React, { useCallback, useMemo } from 'react';
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
import { ArrowLeft, ArrowRight, TriangleAlert } from 'lucide-react';
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

dayjs.extend(utc);

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportMember {
  generatedId: string;
  name: string;
  acronym: string;
  warnings: string[];
}

interface ImportShift {
  generatedId: string;
  name: string;
  acronym: string;
  shiftType: number;
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

const ACTION_OPTIONS: { value: MergeAction; labelKey: string }[] = [
  { value: 'add_new', labelKey: 'action_add_new' },
  { value: 'merge_into', labelKey: 'action_merge_into' },
  { value: 'skip', labelKey: 'action_skip' },
];

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
  onWorkerMappingsChange,
  onShiftMappingsChange,
  onRequestMappingsChange,
  onAssignmentConfigChange,
  onBack,
  onNext,
}: Props) {
  const { t } = useTranslation(lng, 'admin-import');

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

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Workers */}
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Badge variant="default">{members.length}</Badge>
          <h2 className="text-sm font-semibold">{t('members_tab')}</h2>
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
                    <TableRow key={m.generatedId} data-testid={`merge-worker-row-${m.generatedId}`}>
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
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Badge variant="default">{shifts.length}</Badge>
          <h2 className="text-sm font-semibold">{t('shifts_tab')}</h2>
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
                    <TableRow key={s.generatedId} data-testid={`merge-shift-row-${s.generatedId}`}>
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
                        className={isCascadedSkip ? 'text-muted-foreground line-through' : ''}
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

      {/* Assignments config */}
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Badge variant="default">{effectiveAssignments}</Badge>
          <h2 className="text-sm font-semibold">{t('schedule_tab')}</h2>
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
    </div>
  );
}
