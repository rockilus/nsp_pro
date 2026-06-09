'use client';

import React, { Suspense, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import AdminImportMergeStep1 from '@/components/admin/admin-import-merge-step1';
import AdminImportMergeStep2 from '@/components/admin/admin-import-merge-step2';
import AdminImportMergeConfirm from '@/components/admin/admin-import-merge-confirm';
import {
  type MergeAction,
  type MergeRequest,
  type MergeResult,
  type MergeTargetsResponse,
} from '@/app/lib/import-merge-utils';
import { useImportMergeStore } from '@/stores/import-merge-store';
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';

// ── Auth helpers ─────────────────────────────────────────────────────────────

function buildAuthHeaders(user: { id_token?: string } | null | undefined): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (env.isDevelopment) {
    headers['X-Dev-User-ID'] = env.devUserId;
    headers['X-API-Key'] = env.devApiKey;
  } else if (user?.id_token) {
    headers['Authorization'] = `Bearer ${user.id_token}`;
  }

  return headers;
}

// ── Content component ────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

function MergeContent({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'admin-import');
  const router = useRouter();
  const searchParams = useSearchParams();
  const importId = searchParams.get('id');
  const stepParam = searchParams.get('step');
  const step: Step = stepParam === '2' ? 2 : stepParam === '3' ? 3 : 1;

  const store = useImportMergeStore();
  const { user } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mergeResult, setMergeResult] = React.useState<MergeResult | null>(null);

  // ── Navigate to a step via URL ──
  const goToStep = useCallback(
    (s: Step) => {
      router.push(`/${lng}/admin/import/merge?id=${importId}&step=${s}`, { scroll: false });
    },
    [lng, importId, router],
  );

  // ── Initialize store.importId on mount ──
  useEffect(() => {
    if (importId) {
      store.setImportId(importId);
    }
  }, [importId]); // eslint-disable-line react-hooks/exhaustive-deps -- store is a stable Zustand reference

  // ── Step 1 → 2: targets resolved ──
  const handleTargetsResolved = useCallback(
    (
      data: {
        members: { generatedId: string; name: string; acronym: string; warnings: string[] }[];
        shifts: {
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
        }[];
        requests: {
          generatedId: string;
          workerName: string;
          workerId: string;
          startDate: number;
          endDate: number;
          shiftCode: string;
          status: string;
          warnings: string[];
        }[];
        assignments: {
          generatedId: string;
          workerName: string;
          workerId: string;
          date: number;
          shiftCode: string;
          shiftId: string;
        }[];
      },
      teamId: string,
      tgts: MergeTargetsResponse,
    ) => {
      store.setImportData({
        members: data.members,
        shifts: data.shifts,
        requests: data.requests,
        assignments: data.assignments,
      });
      store.setSelectedTeamId(teamId);
      store.setTargets(tgts);
      store.setWorkerMappings(tgts.suggestedWorkerMappings);
      store.setShiftMappings(tgts.suggestedShiftMappings);
      store.setRequestMappings(
        (data.requests || []).map((r) => ({
          generatedId: r.generatedId,
          action: 'add_new' as MergeAction,
          targetRequestId: null,
        })),
      );
      goToStep(2);
    },
    [store, goToStep],
  );

  // ── Step 2 → 3: confirm ──
  const handleConfirm = useCallback(() => {
    goToStep(3);
  }, [goToStep]);

  // ── Step 3: execute merge ──
  const handleExecuteMerge = useCallback(async () => {
    if (!importId || !store.importData) return;
    setLoading(true);
    setError(null);

    try {
      const headers = buildAuthHeaders(user);
      const payload: MergeRequest = {
        teamId: store.selectedTeamId || '',
        workerMappings: store.workerMappings,
        shiftMappings: store.shiftMappings,
        requestMappings: store.requestMappings,
        assignmentConfig: store.assignmentConfig,
      };

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/admin/imports/${importId}/merge`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        },
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Merge failed: ${resp.status}`);
      }

      const result: MergeResult = await resp.json();
      setMergeResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setLoading(false);
    }
  }, [importId, store, user]);

  // ── Navigation ──
  const handleBack = useCallback(() => {
    if (step === 1) {
      router.push(`/${lng}/admin/import/editor?id=${importId}`);
    } else {
      goToStep((step - 1) as Step);
    }
  }, [step, lng, importId, router, goToStep]);

  // ── Missing import ID ──
  if (!importId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No import ID provided.</p>
      </div>
    );
  }

  // ── Step labels for stepper ──
  const stepLabels: Record<Step, string> = {
    1: t('merge_step1_title') || '1. Select Team',
    2: t('merge_step2_title') || '2. Review Matches',
    3: t('merge_step3_title') || '3. Confirm',
  };

  const importData = store.importData;
  const targets = store.targets;

  return (
    <div className="flex flex-col gap-3">
      {/* Stepper — clickable steps */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {([1, 2, 3] as Step[]).map((s, idx) => {
          const isActive = s === step;
          const isDone = s < step;
          const isClickable = s <= Math.min(step + 1, 3) && importData !== null;
          return (
            <React.Fragment key={s}>
              {idx > 0 && <div className="h-px flex-1 border-t border-border" />}
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={isActive || isDone ? 'default' : 'secondary'}
                  className={`size-6 justify-center rounded-full p-0 text-xs ${
                    isClickable ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (isClickable) {
                      if (s === 1) goToStep(1);
                      else if (s === 2 && importData) goToStep(2);
                      else if (s === 3 && importData) goToStep(3);
                    }
                  }}
                >
                  {s}
                </Badge>
                <span
                  className={`text-xs whitespace-nowrap ${isActive ? 'font-semibold text-foreground' : ''}`}
                >
                  {stepLabels[s]}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 1 && (
        <AdminImportMergeStep1
          lng={lng}
          importId={importId}
          onNext={handleTargetsResolved}
          onBack={handleBack}
        />
      )}

      {step === 2 && importData && targets && (
        <AdminImportMergeStep2
          lng={lng}
          members={importData.members}
          shifts={importData.shifts}
          requests={importData.requests}
          assignments={importData.assignments}
          targets={targets}
          workerMappings={store.workerMappings}
          shiftMappings={store.shiftMappings}
          requestMappings={store.requestMappings}
          assignmentConfig={store.assignmentConfig}
          selectedTeamId={store.selectedTeamId}
          onWorkerMappingsChange={store.setWorkerMappings}
          onShiftMappingsChange={store.setShiftMappings}
          onRequestMappingsChange={store.setRequestMappings}
          onAssignmentConfigChange={store.setAssignmentConfig}
          onBack={handleBack}
          onNext={handleConfirm}
        />
      )}

      {step === 3 && importData && (
        <AdminImportMergeConfirm
          lng={lng}
          workerMappings={store.workerMappings}
          shiftMappings={store.shiftMappings}
          requestMappings={store.requestMappings}
          assignments={importData.assignments}
          assignmentConfig={store.assignmentConfig}
          mergeResult={mergeResult}
          loading={loading}
          onExecute={handleExecuteMerge}
          onBack={handleBack}
          onDone={() => router.push(`/${lng}/admin/import`)}
        />
      )}
    </div>
  );
}

// ── Page component ───────────────────────────────────────────────────────────

export default function AdminImportMergePage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MergeContent lng={lng} />
    </Suspense>
  );
}
