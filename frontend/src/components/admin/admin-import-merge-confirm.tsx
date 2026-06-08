'use client';

import React from 'react';
import { useTranslation } from '@/app/i18n/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  type WorkerMergeMapping,
  type ShiftMergeMapping,
  type RequestMergeMapping,
  type AssignmentMergeConfig,
  type MergeResult,
  computeMergeSummary,
} from '@/app/lib/import-merge-utils';

interface ImportAssignment {
  workerId?: string;
  shiftId?: string;
  date?: number;
}

interface Props {
  lng: string;
  workerMappings: WorkerMergeMapping[];
  shiftMappings: ShiftMergeMapping[];
  requestMappings: RequestMergeMapping[];
  assignments: ImportAssignment[];
  assignmentConfig: AssignmentMergeConfig;
  mergeResult: MergeResult | null;
  loading: boolean;
  onExecute: () => void;
  onBack: () => void;
  onDone: () => void;
}

export default function AdminImportMergeConfirm({
  lng,
  workerMappings,
  shiftMappings,
  requestMappings,
  assignments,
  assignmentConfig,
  mergeResult,
  loading,
  onExecute,
  onBack,
  onDone,
}: Props) {
  const { t } = useTranslation(lng, 'admin-import');

  const summary = React.useMemo(
    () =>
      computeMergeSummary(
        workerMappings,
        shiftMappings,
        requestMappings,
        assignments,
        assignmentConfig,
      ),
    [workerMappings, shiftMappings, requestMappings, assignments, assignmentConfig],
  );

  // ── Show result ──
  if (mergeResult) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="size-5 text-green-500" />
          <h2 className="text-lg font-semibold">{t('merge_success') || 'Merge Complete'}</h2>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">
              {t('workers_created') || 'Workers created'}
            </div>
            <div className="text-xl font-bold text-green-600">{mergeResult.workersCreated}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">
              {t('workers_updated') || 'Workers updated'}
            </div>
            <div className="text-xl font-bold text-blue-600">{mergeResult.workersUpdated}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">
              {t('shifts_created') || 'Shifts created'}
            </div>
            <div className="text-xl font-bold text-green-600">{mergeResult.shiftsCreated}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">
              {t('shifts_updated') || 'Shifts updated'}
            </div>
            <div className="text-xl font-bold text-blue-600">{mergeResult.shiftsUpdated}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">
              {t('requests_created') || 'Requests created'}
            </div>
            <div className="text-xl font-bold text-green-600">{mergeResult.requestsCreated}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">
              {t('assignments_created') || 'Assignments created'}
            </div>
            <div className="text-xl font-bold text-green-600">{mergeResult.assignmentsCreated}</div>
          </div>
        </div>

        <Button onClick={onDone}>{t('back_to_list')}</Button>
      </div>
    );
  }

  // ── Confirm screen ──
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-lg font-semibold">{t('merge_confirm_title') || 'Confirm Merge'}</h2>

      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="size-4" />
        <AlertDescription>
          This action cannot be undone. All data will be permanently written to the target team.
        </AlertDescription>
      </Alert>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">
            {t('workers_created') || 'Workers to create'}
          </div>
          <div className="text-lg font-bold">{summary.workersToCreate}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">
            {t('workers_updated') || 'Workers to update'}
          </div>
          <div className="text-lg font-bold">{summary.workersToUpdate}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">
            {t('shifts_created') || 'Shifts to create'}
          </div>
          <div className="text-lg font-bold">{summary.shiftsToCreate}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">
            {t('shifts_updated') || 'Shifts to update'}
          </div>
          <div className="text-lg font-bold">{summary.shiftsToUpdate}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">
            {t('requests_created') || 'Requests to create'}
          </div>
          <div className="text-lg font-bold">{summary.requestsToCreate}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">
            {t('assignments_created') || 'Assignments to create'}
          </div>
          <div className="text-lg font-bold">{summary.assignmentsToCreate}</div>
        </div>
      </div>

      {/* Skipped summary */}
      {(summary.workersToSkip > 0 || summary.shiftsToSkip > 0 || summary.requestsToSkip > 0) && (
        <div className="mb-4 text-xs text-muted-foreground">
          Skipped: {summary.workersToSkip} worker(s), {summary.shiftsToSkip} shift(s),{' '}
          {summary.requestsToSkip} request(s)
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} disabled={loading}>
          <ArrowLeft className="mr-1.5 size-4" />
          {t('back_to_list')}
        </Button>

        <Button size="sm" onClick={onExecute} disabled={loading}>
          {loading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {loading ? t('saving') || 'Executing...' : t('merge_execute') || 'Execute Merge'}
        </Button>
      </div>
    </div>
  );
}
