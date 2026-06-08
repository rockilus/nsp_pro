'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';
import { getImpersonationToken } from '@/app/lib/impersonation-storage';
import type { MergeTargetsResponse } from '@/app/lib/import-merge-utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
}

// Matches the page-level ImportRecordData — keep in sync
interface ImportRecordData {
  id: string;
  name: string;
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
}

interface Props {
  lng: string;
  importId: string;
  onNext: (data: ImportRecordData, teamId: string, targets: MergeTargetsResponse) => void;
  onBack: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminImportMergeStep1({ lng, importId, onNext, onBack }: Props) {
  const { t } = useTranslation(lng, 'admin-import');
  const { user } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchSummary, setMatchSummary] = useState<string | null>(null);

  // ── Fetch teams ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingTeams(true);
      try {
        const headers = buildAuthHeaders(user);
        delete headers['Content-Type'];
        const resp = await fetch(`${env.apiUrl}/teams/with-memberships`, { headers });
        if (!resp.ok) throw new Error('Failed to load teams');
        const data = await resp.json();
        if (!cancelled) {
          // data is TeamWithMembershipDTO[] — extract team info
          const teamList: Team[] = (data || []).map(
            (item: { team?: { id: string; name: string } }) => ({
              id: item.team?.id || '',
              name: item.team?.name || '',
            }),
          );
          setTeams(teamList);
        }
      } catch {
        if (!cancelled) setError('Failed to load teams');
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Resolve targets ──
  const handleResolve = useCallback(async () => {
    if (!selectedTeamId) return;
    setResolving(true);
    setError(null);

    try {
      // Fetch the full import data first
      const headers = buildAuthHeaders(user);
      delete headers['Content-Type'];
      const importResp = await fetch(`${env.apiUrl}/admin/imports/${importId}`, { headers });
      if (!importResp.ok) throw new Error('Failed to load import data');
      const importData: ImportRecordData = await importResp.json();

      // Then resolve merge targets
      const tgtHeaders = buildAuthHeaders(user);
      const tgtResp = await fetch(
        `${env.apiUrl}/admin/teams/${selectedTeamId}/merge-targets?import_id=${importId}`,
        { headers: tgtHeaders },
      );
      if (!tgtResp.ok) {
        const err = await tgtResp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to resolve merge targets');
      }
      const targets: MergeTargetsResponse = await tgtResp.json();

      // Build summary
      const wCreate = targets.suggestedWorkerMappings.filter((m) => m.action === 'add_new').length;
      const wMerge = targets.suggestedWorkerMappings.filter(
        (m) => m.action === 'merge_into',
      ).length;
      const sCreate = targets.suggestedShiftMappings.filter((m) => m.action === 'add_new').length;
      const sMerge = targets.suggestedShiftMappings.filter((m) => m.action === 'merge_into').length;

      setMatchSummary(
        `${wCreate + wMerge} workers (${wMerge} matched, ${wCreate} new) · ` +
          `${sCreate + sMerge} shifts (${sMerge} matched, ${sCreate} new)`,
      );

      onNext(importData, selectedTeamId, targets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resolution failed');
    } finally {
      setResolving(false);
    }
  }, [selectedTeamId, importId, user, onNext]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-lg font-semibold">
        {t('merge_step1_title') || 'Step 1: Select Target Team'}
      </h2>

      <p className="mb-4 text-sm text-muted-foreground">
        Choose which team this imported data should be merged into. Existing team members and shifts
        with matching names or codes will be automatically identified.
      </p>

      {/* Team selector */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium">
          {t('select_target_team') || 'Target Team'}
        </label>
        {loadingTeams ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading teams...
          </div>
        ) : (
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-full max-w-sm" data-testid="merge-team-select">
              <SelectValue placeholder={t('select_team_placeholder') || 'Choose a team...'} />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Match summary */}
      {matchSummary && (
        <Alert className="mb-4" data-testid="merge-match-summary">
          <CheckCircle2 className="size-4" />
          <AlertDescription>{matchSummary}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="merge-step1-back">
          <ArrowLeft className="mr-1.5 size-4" />
          {t('back_to_list')}
        </Button>

        <Button
          size="sm"
          onClick={handleResolve}
          disabled={!selectedTeamId || resolving}
          data-testid="merge-resolve-btn"
        >
          {resolving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {resolving ? 'Resolving...' : t('merge_step2_title') || 'Next: Review Matches'}
          {!resolving && <ArrowRight className="ml-1.5 size-4" />}
        </Button>
      </div>
    </div>
  );
}
