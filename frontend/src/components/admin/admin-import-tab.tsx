'use client';

import React, { useCallback, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
// shadcn
import { Button } from '@/components/ui/button';
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
// Icons (lucide)
import { ChevronLeft, ChevronRight, Upload, TriangleAlert, Loader2 } from 'lucide-react';
// Components
// Hooks
import { useAuth } from '@/contexts/auth-context';
// Config
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

interface ImportPreviewData {
  members: ImportMemberPreview[];
  shifts: ImportShiftPreview[];
  requests: ImportRequestPreview[];
  assignments: ImportAssignmentPreview[];
  errors: string[];
  warnings: string[];
}

type WizardStep = 'upload' | 'loading' | 'preview' | 'error';

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

// ── Auth headers helper (reuse dev/prod pattern from APIClient) ──────────────

function buildAuthHeaders(user: { id_token?: string } | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {};

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

export default function AdminImportTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'admin-import');
  const { user } = useAuth();

  const [step, setStep] = useState<WizardStep>('upload');
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Upload handler ────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setErrorMessage(t('invalid_file'));
        setStep('error');
        return;
      }

      setStep('loading');
      setErrorMessage(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const headers = buildAuthHeaders(user);
        // Remove Content-Type so the browser sets multipart boundary
        const { 'Content-Type': _, ...fetchHeaders } = {
          ...headers,
          'Content-Type': undefined as unknown as string,
        };
        delete (fetchHeaders as Record<string, string>)['Content-Type'];

        const resp = await fetch(`${env.apiUrl}/admin/import/preview`, {
          method: 'POST',
          headers: fetchHeaders,
          body: formData,
        });

        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          throw new Error(errBody.detail || errBody.message || `Server error: ${resp.status}`);
        }

        const data: ImportPreviewData = await resp.json();

        if (data.errors.length > 0 && data.members.length === 0) {
          // Fatal errors only — show error step
          setErrorMessage(data.errors.join('\n'));
          setStep('error');
          return;
        }

        setPreviewData(data);
        setStep('preview');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
        setStep('error');
      }
    },
    [user, t],
  );

  // ── Render: Upload step ───────────────────────────────────────────────

  const renderUpload = () => (
    <div className="flex max-w-lg flex-col gap-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-lg font-semibold">{t('upload_excel')}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t('upload_excel_hint')}</p>

        <div className="flex items-center gap-2">
          <Button asChild>
            <label className="cursor-pointer">
              <Upload className="mr-1.5 size-4" />
              {t('upload_and_preview')}
              <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileUpload} />
            </label>
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Render: Loading step ──────────────────────────────────────────────

  const renderLoading = () => (
    <div className="flex flex-col items-center gap-2 py-8">
      <Loader2 className="size-12 animate-spin text-muted-foreground" />
      <p className="text-sm">{t('uploading')}</p>
    </div>
  );

  // ── Render: Preview step ──────────────────────────────────────────────

  const renderPreview = () => {
    if (!previewData) return null;

    const { members, shifts, requests, assignments, errors, warnings } = previewData;

    const hasWarnings = warnings.length > 0 || errors.length > 0;

    return (
      <div className="flex flex-col gap-3">
        {/* Summary bar */}
        <div className="rounded-lg border border-border bg-card p-3">
          <h3 className="mb-1 font-semibold">
            {t('preview_summary')
              .replace('{workers}', String(members.length))
              .replace('{shifts}', String(shifts.length))
              .replace('{requests}', String(requests.length))
              .replace('{assignments}', String(assignments.length))}
          </h3>
          {errors.length > 0 && (
            <Alert variant="destructive" className="mt-1">
              <AlertTitle>{t('errors_found').replace('{count}', String(errors.length))}</AlertTitle>
            </Alert>
          )}
          {!errors.length && warnings.length > 0 && (
            <Accordion type="single" collapsible className="mt-1">
              <AccordionItem
                value="warnings"
                className="rounded-lg border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
              >
                <AccordionTrigger className="px-3 py-2 text-sm font-semibold">
                  {t('warnings_found').replace('{count}', String(warnings.length))}
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-2">
                  <ul className="list-disc pl-5">
                    {warnings.map((w, i) => (
                      <li key={i}>
                        <p className="text-sm">{w}</p>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          {!hasWarnings && (
            <Alert
              variant="default"
              className="mt-1 border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
            >
              <AlertTitle>{t('no_errors')}</AlertTitle>
            </Alert>
          )}
        </div>

        {/* Members accordion */}
        <Accordion type="multiple" defaultValue={['members', 'shifts']}>
          <AccordionItem value="members">
            <AccordionTrigger className="gap-2">
              <Badge variant="default">{members.length}</Badge>
              <span className="font-semibold">{t('members_tab')}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-hidden rounded-lg border border-border">
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
                    {members.map((m) => (
                      <TableRow key={m.generatedId}>
                        <TableCell>
                          {m.name}
                          {m.warnings.length > 0 && (
                            <TriangleAlert className="ml-1 inline size-4 align-middle text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell>{m.acronym}</TableCell>
                        <TableCell>{unixToDateStr(m.employmentStartDate)}</TableCell>
                        <TableCell>
                          {m.employmentEndDate ? unixToDateStr(m.employmentEndDate) : '—'}
                        </TableCell>
                        <TableCell>{m.weeklyHours}</TableCell>
                        <TableCell>{m.weeklyHoursDesired}</TableCell>
                        <TableCell>{m.dutiesPerMonth}</TableCell>
                        <TableCell>{m.annualLeave}</TableCell>
                        <TableCell>
                          {m.specialtyIds.length > 0 ? `${m.specialtyIds.length} skill(s)` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Shifts accordion */}
          <AccordionItem value="shifts">
            <AccordionTrigger className="gap-2">
              <Badge variant="default">{shifts.length}</Badge>
              <span className="font-semibold">{t('shifts_tab')}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {shifts.map((s) => (
                      <TableRow key={s.generatedId}>
                        <TableCell>
                          {s.name}
                          {s.warnings.length > 0 && (
                            <TriangleAlert className="ml-1 inline size-4 align-middle text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            style={{ backgroundColor: s.color, color: '#fff' }}
                            className="font-bold"
                          >
                            {s.acronym}
                          </Badge>
                        </TableCell>
                        <TableCell>{shiftTypeLabel(s.shiftType, t)}</TableCell>
                        <TableCell>{minutesToTimeStr(s.startTime)}</TableCell>
                        <TableCell>{minutesToTimeStr(s.endTime)}</TableCell>
                        <TableCell>{s.duty ? '✓' : '—'}</TableCell>
                        <TableCell>{s.mandatoryRest ? '✓' : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Requests accordion */}
          {requests.length > 0 && (
            <AccordionItem value="requests">
              <AccordionTrigger className="gap-2">
                <Badge variant="default">{requests.length}</Badge>
                <span className="font-semibold">{t('requests_tab')}</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('worker')}</TableHead>
                        <TableHead>{t('start_date')}</TableHead>
                        <TableHead>{t('end_date')}</TableHead>
                        <TableHead>{t('shift')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((r) => (
                        <TableRow key={r.generatedId}>
                          <TableCell>{r.workerName}</TableCell>
                          <TableCell>{unixToDateStr(r.startDate)}</TableCell>
                          <TableCell>{unixToDateStr(r.endDate)}</TableCell>
                          <TableCell>{r.shiftCode}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-500 hover:bg-green-500">
                              {r.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Schedule accordion (monthly grid) */}
          <AccordionItem value="schedule">
            <AccordionTrigger className="gap-2">
              <Badge variant="default">{assignments.length}</Badge>
              <span className="font-semibold">{t('schedule_tab')}</span>
            </AccordionTrigger>
            <AccordionContent>
              <ScheduleGrid assignments={assignments} shifts={shifts} workerLabel={t('worker')} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Back button */}
        <div>
          <Button variant="outline" onClick={() => setStep('upload')}>
            {t('back_to_upload')}
          </Button>
        </div>
      </div>
    );
  };

  // ── Render: Error step ────────────────────────────────────────────────

  const renderError = () => (
    <div className="flex max-w-xl flex-col gap-2">
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      <div>
        <Button variant="outline" onClick={() => setStep('upload')}>
          {t('back_to_upload')}
        </Button>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{t('title')}</h1>

      <div className="py-2">
        {step === 'upload' && renderUpload()}
        {step === 'loading' && renderLoading()}
        {step === 'preview' && renderPreview()}
        {step === 'error' && renderError()}
      </div>
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

  // Build the grid lookup and date bounds (all UTC)
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
    return null;
  }

  // Auto-initialize month on first render
  if (!scheduleMonth) {
    setScheduleMonth(minDate.format('YYYY-MM'));
    return null;
  }

  // Current displayed month (UTC)
  const current = dayjs.utc(scheduleMonth + '-01');
  const monthStart = current.startOf('month');
  const monthEnd = current.endOf('month');
  const minMonthStart = minDate.startOf('month');
  const maxMonthStart = maxDate.startOf('month');

  const canPrev = monthStart.isAfter(minMonthStart);
  const canNext = monthStart.isBefore(maxMonthStart);

  const goPrev = () => {
    setScheduleMonth(monthStart.subtract(1, 'month').format('YYYY-MM'));
  };
  const goNext = () => {
    setScheduleMonth(monthStart.add(1, 'month').format('YYYY-MM'));
  };

  // Build day columns for the month
  const days: dayjs.Dayjs[] = [];
  let cursor = monthStart;
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'day')) {
    days.push(cursor);
    cursor = cursor.add(1, 'day');
  }

  const monthLabel = monthStart.format('MMMM YYYY');

  // Shift color map — normalize keys to uppercase for case-insensitive matching
  const shiftColorMap: Record<string, string> = {};
  for (const s of shifts) {
    shiftColorMap[s.acronym.toUpperCase()] = s.color;
  }

  return (
    <div>
      {/* Navigation bar */}
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

      {/* Grid table */}
      <div className="overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-[120px] bg-card">
                {workerLabel}
              </TableHead>
              {days.map((d) => (
                <TableHead key={d.toISOString()} className="min-w-[40px] text-center text-xs">
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
                  <TableCell className="sticky left-0 z-10 bg-card text-xs font-medium">
                    {name}
                  </TableCell>
                  {days.map((d) => {
                    const dateKey = d.format('YYYY-MM-DD');
                    const codes = row[dateKey];
                    return (
                      <TableCell key={dateKey} className="p-0.5 text-center">
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
                          <span className="text-xs text-muted-foreground">—</span>
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
