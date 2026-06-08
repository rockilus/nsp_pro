'use client';

import React, { Suspense, useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { Loader2 } from 'lucide-react';
import AdminImportMergeStep1 from '@/components/admin/admin-import-merge-step1';
import AdminImportMergeStep2 from '@/components/admin/admin-import-merge-step2';
import AdminImportMergeConfirm from '@/components/admin/admin-import-merge-confirm';
import {
  type MergeAction,
  type MergeRequest,
  type MergeResult,
  type MergeTargetsResponse,
  type WorkerMergeMapping,
  type ShiftMergeMapping,
  type RequestMergeMapping,
  type AssignmentMergeConfig,
} from '@/app/lib/import-merge-utils';
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';
import { getImpersonationToken } from '@/app/lib/impersonation-storage';

// ── Import record types (subset needed for the wizard) ───────────────────────

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

interface ImportRecordData {
  id: string;
  name: string;
  members: ImportMember[];
  shifts: ImportShift[];
  requests: ImportRequest[];
  assignments: ImportAssignment[];
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

function buildAuthHeaders(user: { id_token?: string } | null | undefined): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (env.isDevelopment) {
    headers['X-Dev-User-ID'] = env.devUserId;
    headers['X-API-Key'] = env.devApiKey;
  } else if (user?.id_token) {
    headers['Authorization'] = `Bearer ${user.id_token}`;
  }

  const impToken = getImpersonationToken();
  if (impToken) {
    headers['X-Impersonation-Token'] = impToken;
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

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared state across steps
  const [importData, setImportData] = useState<ImportRecordData | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [targets, setTargets] = useState<MergeTargetsResponse | null>(null);
  const [workerMappings, setWorkerMappings] = useState<WorkerMergeMapping[]>([]);
  const [shiftMappings, setShiftMappings] = useState<ShiftMergeMapping[]>([]);
  const [requestMappings, setRequestMappings] = useState<RequestMergeMapping[]>([]);
  const [assignmentConfig, setAssignmentConfig] = useState<AssignmentMergeConfig>({
    includeAll: true,
    startDate: null,
    endDate: null,
  });
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);

  // Auth context — use the real auth context
  const { user } = useAuth();

  // ── Step 1 → 2: targets resolved ──
  const handleTargetsResolved = useCallback(
    (data: ImportRecordData, teamId: string, tgts: MergeTargetsResponse) => {
      setImportData(data);
      setSelectedTeamId(teamId);
      setTargets(tgts);
      // Initialize mappings from auto-match suggestions
      setWorkerMappings(tgts.suggestedWorkerMappings);
      setShiftMappings(tgts.suggestedShiftMappings);
      // Default requests to add_new unless cascaded out later
      setRequestMappings(
        (data.requests || []).map((r) => ({
          generatedId: r.generatedId,
          action: 'add_new' as MergeAction,
          targetRequestId: null,
        })),
      );
      setStep(2);
    },
    [],
  );

  // ── Step 2 → 3: confirm ──
  const handleConfirm = useCallback(() => {
    setStep(3);
  }, []);

  // ── Step 3: execute merge ──
  const handleExecuteMerge = useCallback(async () => {
    if (!importId || !importData) return;
    setLoading(true);
    setError(null);

    try {
      const headers = buildAuthHeaders(user);
      const payload: MergeRequest = {
        teamId: selectedTeamId,
        workerMappings,
        shiftMappings,
        requestMappings,
        assignmentConfig,
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
  }, [
    importId,
    importData,
    selectedTeamId,
    workerMappings,
    shiftMappings,
    requestMappings,
    assignmentConfig,
    user,
  ]);

  // ── Navigation ──
  const handleBack = useCallback(() => {
    if (step === 1) {
      router.push(`/${lng}/admin/import/editor?id=${importId}`);
    } else if (step === 2) {
      setStep(1);
    } else {
      setStep(2);
    }
  }, [step, lng, importId, router]);

  // ── Missing import ID ──
  if (!importId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No import ID provided.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={step >= 1 ? 'font-semibold text-foreground' : ''}>
          {t('merge_step1_title') || '1. Select Team'}
        </span>
        <span>→</span>
        <span className={step >= 2 ? 'font-semibold text-foreground' : ''}>
          {t('merge_step2_title') || '2. Review Matches'}
        </span>
        <span>→</span>
        <span className={step >= 3 ? 'font-semibold text-foreground' : ''}>
          {t('merge_step3_title') || '3. Confirm'}
        </span>
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
          workerMappings={workerMappings}
          shiftMappings={shiftMappings}
          requestMappings={requestMappings}
          assignmentConfig={assignmentConfig}
          onWorkerMappingsChange={setWorkerMappings}
          onShiftMappingsChange={setShiftMappings}
          onRequestMappingsChange={setRequestMappings}
          onAssignmentConfigChange={setAssignmentConfig}
          onBack={handleBack}
          onNext={handleConfirm}
        />
      )}

      {step === 3 && importData && (
        <AdminImportMergeConfirm
          lng={lng}
          workerMappings={workerMappings}
          shiftMappings={shiftMappings}
          requestMappings={requestMappings}
          assignments={importData.assignments}
          assignmentConfig={assignmentConfig}
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
