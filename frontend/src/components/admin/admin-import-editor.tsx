'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
// shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
// Icons
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Trash2, TriangleAlert } from 'lucide-react';
// Components
import EditableCell from './editable-cell';
import ImportLegend from './import-legend';
import { commitEdit } from '@/app/lib/import-preview-utils';
// Auth
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';
import { getImpersonationToken } from '@/app/lib/impersonation-storage';

dayjs.extend(utc);

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportMemberPreview {
  generatedId: string;
  name: string;
  acronym: string;
  acronymCustom: boolean;
  employmentStartDate: number;
  employmentEndDate: number | null;
  weeklyHours: number;
  weeklyHoursDesired: number;
  dutiesPerMonth: number;
  annualLeave: number;
  specialtyIds: string[];
  warnings: string[];
  defaultedFields: string[];
}

interface ImportShiftPreview {
  generatedId: string;
  name: string;
  acronym: string;
  acronymCustom: boolean;
  startTime: number;
  endTime: number;
  staffing: unknown[];
  color: string;
  shiftType: number;
  restType: number;
  leaveType: number;
  recuperationTime: number;
  recuperationDutyId: string | null;
  duty: boolean;
  mandatoryRest: boolean;
  warnings: string[];
  defaultedFields: string[];
}

interface ImportRequestPreview {
  generatedId: string;
  workerName: string;
  workerId: string;
  requestType: string;
  startDate: number;
  endDate: number;
  shiftCode: string;
  status: string;
  fulfillment: string;
  warnings: string[];
  defaultedFields: string[];
}

interface ImportAssignmentPreview {
  generatedId: string;
  workerName: string;
  workerId: string;
  date: number;
  shiftCode: string;
  shiftId: string;
  fixed: boolean;
  source: string;
  warnings: string[];
}

interface ImportRecordData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  filename: string;
  members: ImportMemberPreview[];
  shifts: ImportShiftPreview[];
  requests: ImportRequestPreview[];
  assignments: ImportAssignmentPreview[];
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

interface Props {
  lng: string;
  importId: string;
}

export default function AdminImportEditor({ lng, importId }: Props) {
  const { t } = useTranslation(lng, 'admin-import');
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ImportRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importName, setImportName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Inline editing state (same as preview)
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, unknown>>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Debounce ref for auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch import ───────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const headers = buildAuthHeaders(user);
        delete headers['Content-Type']; // GET request
        const resp = await fetch(`${env.apiUrl}/admin/imports/${importId}`, { headers });
        if (!resp.ok) throw new Error('Import not found');
        const json: ImportRecordData = await resp.json();
        if (!cancelled) {
          setData(json);
          setImportName(json.name);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [importId, user]);

  // ── Auto-save ──────────────────────────────────────────────────────────

  const saveToServer = useCallback(
    async (name: string, edits: Record<string, Record<string, unknown>>, deleted: Set<string>) => {
      if (!data) return;
      setSaveStatus('saving');

      try {
        // Merge edited values over the DTO data, excluding deleted rows
        const members = data.members
          .filter((m) => !deleted.has(m.generatedId))
          .map((m) => ({ ...m, ...edits[m.generatedId] }));

        const shifts = data.shifts
          .filter((s) => !deleted.has(s.generatedId))
          .map((s) => ({ ...s, ...edits[s.generatedId] }));

        const requests = data.requests
          .filter((r) => !deleted.has(r.generatedId))
          .map((r) => ({ ...r, ...edits[r.generatedId] }));

        const headers = buildAuthHeaders(user);
        const resp = await fetch(`${env.apiUrl}/admin/imports/${importId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name,
            members,
            shifts,
            requests,
          }),
        });

        if (!resp.ok) throw new Error('Save failed');
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    },
    [data, importId, user],
  );

  // Debounced save trigger
  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToServer(importName, editedValues, deletedIds);
    }, 2000);
  }, [importName, editedValues, deletedIds, saveToServer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCellCommit = useCallback(
    (entityId: string, field: string, rawValue: string, originalValue: unknown) => {
      commitEdit(entityId, field, rawValue, originalValue, setEditedValues);
      // Trigger save after a short delay to let state settle
      setTimeout(() => triggerSave(), 50);
    },
    [triggerSave],
  );

  const handleDeleteRow = useCallback(
    (entityId: string) => {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.add(entityId);
        return next;
      });
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[entityId];
        return next;
      });
      triggerSave();
    },
    [triggerSave],
  );

  const handleNameChange = useCallback(
    (newName: string) => {
      setImportName(newName);
      // Save name immediately (no debounce needed for name)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveToServer(newName, editedValues, deletedIds);
      }, 500);
    },
    [editedValues, deletedIds, saveToServer],
  );

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <p className="text-destructive">{error || 'Import not found'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          {t('back_to_list')}
        </Button>
      </div>
    );
  }

  // ── Filter deleted ─────────────────────────────────────────────────────

  const visibleMembers = data.members.filter((m) => !deletedIds.has(m.generatedId));
  const visibleShifts = data.shifts.filter((s) => !deletedIds.has(s.generatedId));
  const visibleRequests = data.requests.filter((r) => !deletedIds.has(r.generatedId));

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => router.push(`/${lng}/admin/import`)}
          title={t('back_to_list')}
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <Input
            value={importName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="h-8 max-w-md border-transparent bg-transparent text-lg font-semibold hover:border-border focus:border-border"
          />
          {/* Metadata subtitle */}
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {t('imported_on')}: {dayjs.unix(data.createdAt).utc().format('YYYY-MM-DD HH:mm')}
            </span>
            <span>
              {t('imported_by')}: {data.createdBy}
            </span>
            <span className="max-w-[300px] truncate">
              {t('import_file')}: {data.filename}
            </span>
            <span>
              {t('last_updated')}: {dayjs.unix(data.updatedAt).utc().format('YYYY-MM-DD HH:mm')}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              {t('saving')}
            </span>
          )}
          {saveStatus === 'saved' && <span>{t('all_saved')}</span>}
          {saveStatus === 'error' && <span className="text-destructive">{t('save_failed')}</span>}
        </div>
      </div>

      {/* Tables */}
      <Accordion type="multiple" defaultValue={['members', 'shifts']}>
        {/* Members */}
        <AccordionItem value="members">
          <AccordionTrigger className="gap-2">
            <Badge variant="default">{visibleMembers.length}</Badge>
            <span className="font-semibold">{t('members_tab')}</span>
          </AccordionTrigger>
          <AccordionContent>
            <ImportLegend lng={lng} />
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
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
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleMembers.map((m) => (
                    <TableRow key={m.generatedId}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <EditableCell
                            entityId={m.generatedId}
                            field="name"
                            value={m.name}
                            defaultedFields={m.defaultedFields}
                            editedValues={editedValues}
                            onCommit={handleCellCommit}
                            fieldType="text"
                          />
                          {m.warnings.length > 0 && (
                            <TriangleAlert className="size-4 shrink-0 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={m.generatedId}
                          field="acronym"
                          value={m.acronym}
                          defaultedFields={m.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="text"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={m.generatedId}
                          field="employmentStartDate"
                          value={m.employmentStartDate}
                          defaultedFields={m.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="date"
                          displayFormatter={(v) => unixToDateStr(v as number)}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={m.generatedId}
                          field="employmentEndDate"
                          value={m.employmentEndDate}
                          defaultedFields={m.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="date"
                          displayFormatter={(v) => (v ? unixToDateStr(v as number) : '—')}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={m.generatedId}
                          field="weeklyHours"
                          value={m.weeklyHours}
                          defaultedFields={m.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="number"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={m.generatedId}
                          field="weeklyHoursDesired"
                          value={m.weeklyHoursDesired}
                          defaultedFields={m.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="number"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={m.generatedId}
                          field="dutiesPerMonth"
                          value={m.dutiesPerMonth}
                          defaultedFields={m.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="number"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={m.generatedId}
                          field="annualLeave"
                          value={m.annualLeave}
                          defaultedFields={m.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="number"
                        />
                      </TableCell>
                      <TableCell>
                        {m.specialtyIds.length > 0 ? `${m.specialtyIds.length} skill(s)` : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteRow(m.generatedId)}
                          title="Delete row"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Shifts */}
        <AccordionItem value="shifts">
          <AccordionTrigger className="gap-2">
            <Badge variant="default">{visibleShifts.length}</Badge>
            <span className="font-semibold">{t('shifts_tab')}</span>
          </AccordionTrigger>
          <AccordionContent>
            <ImportLegend lng={lng} />
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">{t('color')}</TableHead>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('code')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('start_time')}</TableHead>
                    <TableHead>{t('end_time')}</TableHead>
                    <TableHead>{t('duty')}</TableHead>
                    <TableHead>{t('mandatory_rest')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleShifts.map((s) => (
                    <TableRow key={s.generatedId}>
                      <TableCell>
                        <div
                          className="size-4 rounded-full border border-border/50"
                          style={{ backgroundColor: s.color }}
                          title={s.color}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <EditableCell
                            entityId={s.generatedId}
                            field="name"
                            value={s.name}
                            defaultedFields={s.defaultedFields}
                            editedValues={editedValues}
                            onCommit={handleCellCommit}
                            fieldType="text"
                          />
                          {s.warnings.length > 0 && (
                            <TriangleAlert className="size-4 shrink-0 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        <EditableCell
                          entityId={s.generatedId}
                          field="acronym"
                          value={s.acronym}
                          defaultedFields={s.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="text"
                        />
                      </TableCell>
                      <TableCell>{shiftTypeLabel(s.shiftType, t)}</TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={s.generatedId}
                          field="startTime"
                          value={s.startTime}
                          defaultedFields={s.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="time"
                          displayFormatter={(v) => minutesToTimeStr(v as number)}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={s.generatedId}
                          field="endTime"
                          value={s.endTime}
                          defaultedFields={s.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="time"
                          displayFormatter={(v) => minutesToTimeStr(v as number)}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={s.generatedId}
                          field="duty"
                          value={s.duty}
                          defaultedFields={s.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="boolean"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          entityId={s.generatedId}
                          field="mandatoryRest"
                          value={s.mandatoryRest}
                          defaultedFields={s.defaultedFields}
                          editedValues={editedValues}
                          onCommit={handleCellCommit}
                          fieldType="boolean"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteRow(s.generatedId)}
                          title="Delete row"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Requests */}
        {visibleRequests.length > 0 && (
          <AccordionItem value="requests">
            <AccordionTrigger className="gap-2">
              <Badge variant="default">{visibleRequests.length}</Badge>
              <span className="font-semibold">{t('requests_tab')}</span>
            </AccordionTrigger>
            <AccordionContent>
              <ImportLegend lng={lng} />
              <div className="mt-2 overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('worker')}</TableHead>
                      <TableHead>{t('start_date')}</TableHead>
                      <TableHead>{t('end_date')}</TableHead>
                      <TableHead>{t('shift')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRequests.map((r) => (
                      <TableRow key={r.generatedId}>
                        <TableCell className="text-muted-foreground">{r.workerName}</TableCell>
                        <TableCell>
                          <EditableCell
                            entityId={r.generatedId}
                            field="startDate"
                            value={r.startDate}
                            defaultedFields={r.defaultedFields}
                            editedValues={editedValues}
                            onCommit={handleCellCommit}
                            fieldType="date"
                            displayFormatter={(v) => unixToDateStr(v as number)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            entityId={r.generatedId}
                            field="endDate"
                            value={r.endDate}
                            defaultedFields={r.defaultedFields}
                            editedValues={editedValues}
                            onCommit={handleCellCommit}
                            fieldType="date"
                            displayFormatter={(v) => unixToDateStr(v as number)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            entityId={r.generatedId}
                            field="shiftCode"
                            value={r.shiftCode}
                            defaultedFields={r.defaultedFields}
                            editedValues={editedValues}
                            onCommit={handleCellCommit}
                            fieldType="text"
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            entityId={r.generatedId}
                            field="status"
                            value={r.status}
                            defaultedFields={r.defaultedFields}
                            editedValues={editedValues}
                            onCommit={handleCellCommit}
                            fieldType="text"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteRow(r.generatedId)}
                            title="Delete row"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Schedule (monthly grid) */}
        {data.assignments.length > 0 && (
          <AccordionItem value="schedule">
            <AccordionTrigger className="gap-2">
              <Badge variant="default">{data.assignments.length}</Badge>
              <span className="font-semibold">{t('schedule_tab')}</span>
            </AccordionTrigger>
            <AccordionContent>
              <ScheduleGrid
                assignments={data.assignments}
                shifts={data.shifts}
                workerLabel={t('worker')}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

// ── Schedule grid sub-component ─────────────────────────────────────────────

function ScheduleGrid({
  assignments,
  shifts,
  workerLabel,
}: {
  assignments: ImportAssignmentPreview[];
  shifts: ImportShiftPreview[];
  workerLabel: string;
}) {
  const [scheduleMonth, setScheduleMonth] = useState('');

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

  if (!minDate || !maxDate || workers.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No schedule data</p>;
  }

  if (!scheduleMonth) {
    setScheduleMonth(minDate.format('YYYY-MM'));
    return null;
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

  const shiftColorMap: Record<string, string> = {};
  for (const s of shifts) {
    shiftColorMap[s.acronym.toUpperCase()] = s.color;
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
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={!canNext}
          onClick={goNext}
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
              return (
                <TableRow key={name}>
                  <TableCell className="sticky left-0 z-10 border-r border-border/30 bg-card text-xs font-medium">
                    {name}
                  </TableCell>
                  {days.map((d) => {
                    const dateKey = d.format('YYYY-MM-DD');
                    const codes = row[dateKey];
                    return (
                      <TableCell
                        key={dateKey}
                        className="border-l border-border/30 p-0.5 text-center"
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
