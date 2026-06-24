'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';
import ImportScheduleGrid from './import-schedule-grid';
import type { ScheduleGridAssignment } from './import-schedule-grid';

dayjs.extend(utc);

// ── Types ────────────────────────────────────────────────────────────────────

interface MemberFull {
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
}

interface ShiftFull {
  generatedId: string;
  name: string;
  acronym: string;
  shiftType: number;
  startTime: number;
  endTime: number;
  color: string;
  duty: boolean;
  mandatoryRest: boolean;
}

interface ExistingWorker {
  id: string;
  name: string;
  acronym: string;
  employmentStartDate?: number;
  employmentEndDate?: number | null;
  weeklyHours?: number;
  weeklyHoursDesired?: number;
  dutiesPerMonth?: number;
  annualLeave?: number;
  specialtyIds?: string[];
}

interface ExistingShift {
  id: string;
  name: string;
  acronym: string;
  shiftType?: number;
  startTime?: number;
  endTime?: number;
  color?: string;
  duty?: boolean;
  mandatoryRest?: boolean;
}

interface Props {
  lng: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'members' | 'shifts' | 'schedule';
  teamId: string | null;
  importedMembers?: MemberFull[];
  importedShifts?: ShiftFull[];
  /** When type === 'schedule', the imported shift definitions for the grid */
  importedShiftDefs?: { acronym: string; color: string }[];
  /** Date range for fetching existing assignments (max 365 days). Defaults to current year. */
  scheduleStartDate?: number | null;
  scheduleEndDate?: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function unixToDateStr(ts: number): string {
  return dayjs.unix(ts).utc().format('YYYY-MM-DD');
}

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Convert a Unix timestamp (epoch seconds) to a HH:MM time-of-day string in UTC */
function unixTsToTimeStr(ts: number): string {
  return dayjs.unix(ts).utc().format('HH:mm');
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

// ── API helpers ──────────────────────────────────────────────────────────────

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (env.isDevelopment) {
    headers['X-Dev-User-ID'] = env.devUserId;
    headers['X-API-Key'] = env.devApiKey;
  }

  return headers;
}

/** Raw shape returned by GET /workers/teams/{team_id} */
interface ApiWorker {
  id: string;
  name: string;
  acronym: string;
  employmentStartDate: number;
  employmentEndDate: number | null;
  weeklyHours: number;
  weeklyHoursDesired: number;
  dutiesPerMonth: number;
  annualLeave: number;
  specialtyIds: string[];
}

/** Raw shape returned by GET /shifts/teams/{team_id} */
interface ApiShift {
  id: string;
  name: string;
  acronym: string;
  shiftType: number;
  startTime: number;
  endTime: number;
  color: string;
  restType: number;
}

function mapWorker(api: ApiWorker): ExistingWorker {
  return {
    id: api.id,
    name: api.name,
    acronym: api.acronym,
    employmentStartDate: api.employmentStartDate,
    employmentEndDate: api.employmentEndDate,
    weeklyHours: api.weeklyHours,
    weeklyHoursDesired: api.weeklyHoursDesired,
    dutiesPerMonth: api.dutiesPerMonth,
    annualLeave: api.annualLeave,
    specialtyIds: api.specialtyIds ?? [],
  };
}

function mapShift(api: ApiShift): ExistingShift {
  return {
    id: api.id,
    name: api.name,
    acronym: api.acronym,
    shiftType: api.shiftType,
    startTime: api.startTime,
    endTime: api.endTime,
    color: api.color,
    duty: api.shiftType === 1,
    mandatoryRest: api.restType === 2, // recuperation rest
  };
}

/** Raw shape returned by GET /assignments/teams/{team_id} (matches AssignmentDTO) */
interface ApiAssignment {
  id: string;
  workerId: string;
  date: number;
  shiftId: string;
}

/** Resolve display fields from raw assignment + lookup maps of existing team data */
function resolveAssignment(
  raw: ApiAssignment,
  workerNameMap: Map<string, string>,
  shiftCodeMap: Map<string, string>,
): ScheduleGridAssignment {
  return {
    workerName: workerNameMap.get(raw.workerId) ?? raw.workerId,
    workerId: raw.workerId,
    date: raw.date,
    shiftCode: shiftCodeMap.get(raw.shiftId) ?? raw.shiftId,
    shiftId: raw.shiftId,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportMergeFullTableDialog({
  lng,
  open,
  onOpenChange,
  type,
  teamId,
  importedMembers = [],
  importedShifts = [],
  importedShiftDefs = [],
  scheduleStartDate,
  scheduleEndDate,
}: Props) {
  const { t } = useTranslation(lng, 'admin-import');
  const { user } = useAuth();

  // Internal fetch state for existing team data (members/shifts)
  const [existingWorkers, setExistingWorkers] = useState<ExistingWorker[] | undefined>(undefined);
  const [existingShifts, setExistingShifts] = useState<ExistingShift[] | undefined>(undefined);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Internal fetch state for existing schedule (assignments)
  const [existingAssignments, setExistingAssignments] = useState<
    ScheduleGridAssignment[] | undefined
  >(undefined);
  const [existingAssignmentsLoading, setExistingAssignmentsLoading] = useState(false);

  const fetchExistingData = useCallback(async () => {
    if (!teamId) {
      setExistingWorkers([]);
      setExistingShifts([]);
      return;
    }

    setExistingWorkers(undefined);
    setExistingShifts(undefined);
    setFetchError(null);

    const headers = buildAuthHeaders();
    delete headers['Content-Type']; // GET request

    try {
      if (type === 'members') {
        const resp = await fetch(`${env.apiUrl}/workers/teams/${teamId}`, { headers });
        if (!resp.ok) throw new Error(`Failed to load workers: ${resp.status}`);
        const json: ApiWorker[] = await resp.json();
        setExistingWorkers(json.map(mapWorker));
      } else if (type === 'shifts') {
        const resp = await fetch(`${env.apiUrl}/shifts/teams/${teamId}`, { headers });
        if (!resp.ok) throw new Error(`Failed to load shifts: ${resp.status}`);
        const json: ApiShift[] = await resp.json();
        setExistingShifts(json.map(mapShift));
      } else if (type === 'schedule') {
        setExistingAssignmentsLoading(true);
        try {
          // Use passed-in date range or default to current year (start_date/end_date are required query params)
          const now = dayjs.utc();
          const start = scheduleStartDate ?? now.startOf('year').unix();
          const end = scheduleEndDate ?? now.endOf('year').unix();

          // Fetch assignments, workers, and shifts in parallel so we can
          // resolve workerName + shiftCode for the schedule grid.
          const [assignResp, workersResp, shiftsResp] = await Promise.all([
            fetch(`${env.apiUrl}/assignments/teams/${teamId}?start_date=${start}&end_date=${end}`, {
              headers,
            }),
            fetch(`${env.apiUrl}/workers/teams/${teamId}`, { headers }),
            fetch(`${env.apiUrl}/shifts/teams/${teamId}`, { headers }),
          ]);

          if (!assignResp.ok) throw new Error(`Failed to load assignments: ${assignResp.status}`);

          const data = await assignResp.json();
          const rawAssignments: ApiAssignment[] = data.assignmentsRead ?? [];

          // Build worker name lookup (ID -> name or acronym)
          const workerNameMap = new Map<string, string>();
          if (workersResp.ok) {
            const workerJson: ApiWorker[] = await workersResp.json();
            for (const w of workerJson) {
              workerNameMap.set(w.id, w.name || w.acronym || w.id);
            }
          }

          // Build shift code lookup (ID -> acronym or name)
          const shiftCodeMap = new Map<string, string>();
          if (shiftsResp.ok) {
            const shiftJson: ApiShift[] = await shiftsResp.json();
            for (const s of shiftJson) {
              shiftCodeMap.set(s.id, s.acronym || s.name || s.id);
            }
          }

          const resolved = rawAssignments.map((raw) =>
            resolveAssignment(raw, workerNameMap, shiftCodeMap),
          );
          setExistingAssignments(resolved);
        } finally {
          setExistingAssignmentsLoading(false);
        }
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load');
      setExistingWorkers([]);
      setExistingShifts([]);
    }
  }, [teamId, type, scheduleStartDate, scheduleEndDate]);

  // Fetch when dialog opens
  useEffect(() => {
    if (open && teamId) {
      fetchExistingData();
    }
  }, [open, teamId, fetchExistingData]);

  const titleText =
    type === 'members'
      ? t('full_table_members_title') || 'All Members — Imported vs Existing'
      : type === 'shifts'
        ? t('full_table_shifts_title') || 'All Shifts — Imported vs Existing'
        : t('existing_schedule_title') || 'Existing Team Schedule';

  // ── Schedule type: show existing assignments grid ──
  if (type === 'schedule') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[90vh] max-w-[95vw] overflow-auto sm:max-w-[85vw]"
          data-testid="full-table-dialog-schedule"
        >
          <DialogHeader>
            <DialogTitle>{titleText}</DialogTitle>
          </DialogHeader>

          {existingAssignmentsLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('loading') || 'Loading...'}
              </span>
            </div>
          )}

          {fetchError && !existingAssignmentsLoading && (
            <div className="py-4 text-center text-sm text-destructive">{fetchError}</div>
          )}

          {!existingAssignmentsLoading &&
            !fetchError &&
            existingAssignments &&
            (existingAssignments.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('no_existing_assignments') || 'No existing assignments in this team.'}
              </div>
            ) : (
              <ImportScheduleGrid
                assignments={existingAssignments}
                shifts={importedShiftDefs}
                workerLabel={t('worker')}
              />
            ))}
        </DialogContent>
      </Dialog>
    );
  }

  // ── Members / Shifts type ──
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-[95vw] overflow-auto sm:max-w-[85vw]"
        data-testid={`full-table-dialog-${type}`}
      >
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imported table */}
          <div data-testid={`full-table-imported-${type}`}>
            <h3 className="mb-2 text-sm font-semibold">
              {type === 'members'
                ? t('imported_members') || 'Imported Members'
                : t('imported_shifts') || 'Imported Shifts'}
            </h3>
            {type === 'members' ? (
              <div className="overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>{t('code')}</TableHead>
                      <TableHead>{t('start_date')}</TableHead>
                      <TableHead>{t('end_date')}</TableHead>
                      <TableHead>{t('contract_hours')}</TableHead>
                      <TableHead>{t('desired_hours')}</TableHead>
                      <TableHead>{t('duty_per_month')}</TableHead>
                      <TableHead>{t('annual_leave')}</TableHead>
                      <TableHead>{t('skills')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedMembers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          {t('no_data') || 'No data'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      importedMembers.map((m) => (
                        <TableRow key={m.generatedId}>
                          <TableCell className="text-sm">{m.name}</TableCell>
                          <TableCell className="font-mono text-xs">{m.acronym}</TableCell>
                          <TableCell className="text-xs">
                            {unixToDateStr(m.employmentStartDate)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {m.employmentEndDate ? unixToDateStr(m.employmentEndDate) : '—'}
                          </TableCell>
                          <TableCell className="text-xs">{m.weeklyHours}</TableCell>
                          <TableCell className="text-xs">{m.weeklyHoursDesired}</TableCell>
                          <TableCell className="text-xs">{m.dutiesPerMonth}</TableCell>
                          <TableCell className="text-xs">{m.annualLeave}</TableCell>
                          <TableCell className="text-xs">
                            {m.specialtyIds.length > 0 ? `${m.specialtyIds.length} skill(s)` : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">{t('color')}</TableHead>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>{t('code')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('start_time')}</TableHead>
                      <TableHead>{t('end_time')}</TableHead>
                      <TableHead>{t('duty')}</TableHead>
                      <TableHead>{t('mandatory_rest')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedShifts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          {t('no_data') || 'No data'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      importedShifts.map((s) => (
                        <TableRow key={s.generatedId}>
                          <TableCell>
                            <div
                              className="size-4 rounded-full border border-border/50"
                              style={{ backgroundColor: s.color }}
                              title={s.color}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{s.name}</TableCell>
                          <TableCell className="font-mono text-xs">{s.acronym}</TableCell>
                          <TableCell className="text-xs">
                            {shiftTypeLabel(s.shiftType, t)}
                          </TableCell>
                          <TableCell className="text-xs">{minutesToTimeStr(s.startTime)}</TableCell>
                          <TableCell className="text-xs">{minutesToTimeStr(s.endTime)}</TableCell>
                          <TableCell className="text-xs">{s.duty ? t('yes') : t('no')}</TableCell>
                          <TableCell className="text-xs">
                            {s.mandatoryRest ? t('yes') : t('no')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Existing table */}
          <div data-testid={`full-table-existing-${type}`}>
            <h3 className="mb-2 text-sm font-semibold">
              {type === 'members'
                ? t('existing_members') || 'Existing Team Members'
                : t('existing_shifts') || 'Existing Team Shifts'}
            </h3>
            {fetchError && (
              <div className="py-4 text-center text-sm text-destructive">{fetchError}</div>
            )}
            {!fetchError && type === 'members' && (
              <ExistingMembersTable lng={lng} data={existingWorkers} />
            )}
            {!fetchError && type === 'shifts' && (
              <ExistingShiftsTable lng={lng} data={existingShifts} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Existing members sub-table ───────────────────────────────────────────────

function ExistingMembersTable({ lng, data }: { lng: string; data?: ExistingWorker[] }) {
  const { t } = useTranslation(lng, 'admin-import');

  if (!data) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t('loading') || 'Loading...'}
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('code')}</TableHead>
            <TableHead>{t('start_date')}</TableHead>
            <TableHead>{t('end_date')}</TableHead>
            <TableHead>{t('contract_hours')}</TableHead>
            <TableHead>{t('desired_hours')}</TableHead>
            <TableHead>{t('duty_per_month')}</TableHead>
            <TableHead>{t('annual_leave')}</TableHead>
            <TableHead>{t('skills')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                {t('no_data') || 'No data'}
              </TableCell>
            </TableRow>
          ) : (
            data.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="text-sm">{w.name}</TableCell>
                <TableCell className="font-mono text-xs">{w.acronym}</TableCell>
                <TableCell className="text-xs">
                  {w.employmentStartDate ? unixToDateStr(w.employmentStartDate) : '—'}
                </TableCell>
                <TableCell className="text-xs">
                  {w.employmentEndDate ? unixToDateStr(w.employmentEndDate) : '—'}
                </TableCell>
                <TableCell className="text-xs">{w.weeklyHours ?? '—'}</TableCell>
                <TableCell className="text-xs">{w.weeklyHoursDesired ?? '—'}</TableCell>
                <TableCell className="text-xs">{w.dutiesPerMonth ?? '—'}</TableCell>
                <TableCell className="text-xs">{w.annualLeave ?? '—'}</TableCell>
                <TableCell className="text-xs">
                  {w.specialtyIds?.length ? `${w.specialtyIds.length} skill(s)` : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Existing shifts sub-table ────────────────────────────────────────────────

function ExistingShiftsTable({ lng, data }: { lng: string; data?: ExistingShift[] }) {
  const { t } = useTranslation(lng, 'admin-import');

  if (!data) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t('loading') || 'Loading...'}
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">{t('color')}</TableHead>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('code')}</TableHead>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('start_time')}</TableHead>
            <TableHead>{t('end_time')}</TableHead>
            <TableHead>{t('duty')}</TableHead>
            <TableHead>{t('mandatory_rest')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                {t('no_data') || 'No data'}
              </TableCell>
            </TableRow>
          ) : (
            data.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div
                    className="size-4 rounded-full border border-border/50"
                    style={{ backgroundColor: s.color || '#6B7280' }}
                    title={s.color || '#6B7280'}
                  />
                </TableCell>
                <TableCell className="text-sm">{s.name}</TableCell>
                <TableCell className="font-mono text-xs">{s.acronym}</TableCell>
                <TableCell className="text-xs">{shiftTypeLabel(s.shiftType ?? 0, t)}</TableCell>
                <TableCell className="text-xs">
                  {s.startTime != null ? unixTsToTimeStr(s.startTime) : '—'}
                </TableCell>
                <TableCell className="text-xs">
                  {s.endTime != null ? unixTsToTimeStr(s.endTime) : '—'}
                </TableCell>
                <TableCell className="text-xs">{s.duty ? t('yes') : t('no')}</TableCell>
                <TableCell className="text-xs">{s.mandatoryRest ? t('yes') : t('no')}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
