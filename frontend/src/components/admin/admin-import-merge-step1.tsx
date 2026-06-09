'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Radio } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';
import type { MergeTargetsResponse } from '@/app/lib/import-merge-utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminTeamRow {
  team_id: string;
  team_name: string;
  owner_ids: string[];
  owner_names: string[];
  owner_emails: string[];
}

interface PaginatedTeamsResponse {
  items: AdminTeamRow[];
  total: number;
  page: number;
  page_size: number;
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

  return headers;
}

interface TeamsQueryParams {
  search_name?: string;
  search_owner_name?: string;
  search_owner_email?: string;
  search_team_id?: string;
  search_owner_id?: string;
  page: number;
  page_size: number;
}

// ── Column definition mapping ────────────────────────────────────────────────

const COLUMNS = [
  { key: 'search_name', labelKey: 'team_name', accessor: (row: AdminTeamRow) => row.team_name },
  {
    key: 'search_owner_name',
    labelKey: 'owner_name',
    accessor: (row: AdminTeamRow) => row.owner_names.join(', '),
  },
  {
    key: 'search_owner_email',
    labelKey: 'owner_email',
    accessor: (row: AdminTeamRow) => row.owner_emails.join(', '),
  },
  { key: 'search_team_id', labelKey: 'team_id', accessor: (row: AdminTeamRow) => row.team_id },
  {
    key: 'search_owner_id',
    labelKey: 'owner_id',
    accessor: (row: AdminTeamRow) => row.owner_ids.join(', '),
  },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminImportMergeStep1({ lng, importId, onNext, onBack }: Props) {
  const { t } = useTranslation(lng, 'admin-import');
  const { user } = useAuth();

  // ── Filter state ──
  const [filters, setFilters] = useState<Record<string, string>>({});
  // ── Pagination state ──
  const [page, setPage] = useState(1);
  const pageSize = 30;
  // ── Data state ──
  const [data, setData] = useState<PaginatedTeamsResponse | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ── Selection ──
  const [selectedTeamId, setSelectedTeamId] = useState('');
  // ── Resolution ──
  const [resolving, setResolving] = useState(false);
  const [matchSummary, setMatchSummary] = useState<string | null>(null);

  // Debounce filter inputs
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({});

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(() => {
      setDebouncedFilters((prev) => ({ ...prev, [key]: value }));
    }, 300);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedFilters]);

  // ── Fetch teams ──
  useEffect(() => {
    let cancelled = false;

    async function fetchTeams() {
      if (initialLoad) {
        setInitialLoad(true);
      }
      setFetching(true);
      setError(null);
      try {
        const queryParams: TeamsQueryParams = { page, page_size: pageSize };
        for (const col of COLUMNS) {
          if (debouncedFilters[col.key]) {
            queryParams[col.key] = debouncedFilters[col.key];
          }
        }

        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(queryParams)) {
          if (v !== undefined && v !== '') qs.set(k, String(v));
        }

        const headers = buildAuthHeaders(user);
        delete headers['Content-Type'];
        const resp = await fetch(`${env.apiUrl}/admin/teams?${qs.toString()}`, { headers });
        if (!resp.ok) throw new Error('Failed to load teams');
        const json: PaginatedTeamsResponse = await resp.json();
        if (!cancelled) {
          setData(json);
          setInitialLoad(false);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load teams');
          setInitialLoad(false);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    fetchTeams();
    return () => {
      cancelled = true;
    };
  }, [debouncedFilters, page, user, initialLoad]);

  // ── Resolve targets (unchanged logic) ──
  const handleResolve = useCallback(async () => {
    if (!selectedTeamId) return;
    setResolving(true);
    setError(null);

    try {
      const headers = buildAuthHeaders(user);
      delete headers['Content-Type'];
      const importResp = await fetch(`${env.apiUrl}/admin/imports/${importId}`, { headers });
      if (!importResp.ok) throw new Error('Failed to load import data');
      const importData: ImportRecordData = await importResp.json();

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

  // ── Pagination helpers ──
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const showPagination = data && data.total > pageSize;

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  // ── Render ──
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-lg font-semibold">
        {t('merge_step1_title') || 'Step 1: Select Target Team'}
      </h2>

      <p className="mb-4 text-sm text-muted-foreground">
        Choose which team this imported data should be merged into. Existing team members and shifts
        with matching names or codes will be automatically identified.
      </p>

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

      {/* Team table */}
      <div className="mb-4 overflow-x-auto">
        {initialLoad ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t('loading_teams')}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t('no_teams_found')}
          </div>
        ) : (
          <>
            <div className="relative">
              {fetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-background/50">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className={fetching ? 'pointer-events-none opacity-60' : ''}>
                <Table data-testid="merge-teams-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      {COLUMNS.map((col) => (
                        <TableHead key={col.key}>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium">{t(col.labelKey)}</span>
                            <Input
                              placeholder={t('search_teams')}
                              value={filters[col.key] || ''}
                              onChange={(e) => handleFilterChange(col.key, e.target.value)}
                              className="h-7 min-w-[120px] text-xs"
                              data-testid={`filter-${col.key}`}
                            />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((row) => (
                      <TableRow
                        key={row.team_id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedTeamId === row.team_id ? 'bg-primary/10 hover:bg-primary/15' : ''
                        }`}
                        onClick={() => setSelectedTeamId(row.team_id)}
                        data-testid={`team-row-${row.team_id}`}
                      >
                        <TableCell className="w-10">
                          <Radio
                            className={`size-4 ${
                              selectedTeamId === row.team_id
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </TableCell>
                        {COLUMNS.map((col) => (
                          <TableCell key={col.key} className="text-sm whitespace-nowrap">
                            {col.accessor(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {showPagination && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t('page_x_of_y', { current: page, total: totalPages })}
                </span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {pageNumbers.map((p, i) =>
                      p === 'ellipsis' ? (
                        <PaginationItem key={`e-${i}`}>
                          <span className="px-2 text-muted-foreground">…</span>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={p === page}
                            onClick={() => setPage(p)}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className={
                          page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

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
