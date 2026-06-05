'use client';

import React, { useCallback, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
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
import { ChevronDown, Upload, TriangleAlert, Loader2 } from 'lucide-react';
// Components
import NavigationHeader from '@/components/common/navigation-header';
// Hooks
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
// Config
import { env } from '@/config/env';
import { getImpersonationToken } from '@/app/lib/impersonation-storage';

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
  return new Date(ts * 1000).toISOString().split('T')[0];
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
  const router = useRouter();
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
            <Alert
              variant="default"
              className="mt-1 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              <AlertTitle>
                {t('warnings_found').replace('{count}', String(warnings.length))}
              </AlertTitle>
            </Alert>
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

          {/* Schedule accordion (summary) */}
          <AccordionItem value="schedule">
            <AccordionTrigger className="gap-2">
              <Badge variant="default">{assignments.length}</Badge>
              <span className="font-semibold">{t('schedule_tab')}</span>
            </AccordionTrigger>
            <AccordionContent>
              <h4 className="mb-2 text-sm font-semibold">{t('schedule_summary')}</h4>
              <div className="mb-3 flex flex-wrap gap-3">
                <div className="min-w-[120px] rounded-lg border border-border p-2">
                  <p className="text-xs text-muted-foreground">{t('total_assignments')}</p>
                  <p className="text-xl font-semibold">{assignments.length}</p>
                </div>
                <div className="min-w-[120px] rounded-lg border border-border p-2">
                  <p className="text-xs text-muted-foreground">{t('unique_workers')}</p>
                  <p className="text-xl font-semibold">
                    {new Set(assignments.map((a) => a.workerName)).size}
                  </p>
                </div>
                <div className="min-w-[120px] rounded-lg border border-border p-2">
                  <p className="text-xs text-muted-foreground">{t('unique_shifts')}</p>
                  <p className="text-xl font-semibold">
                    {new Set(assignments.map((a) => a.shiftCode)).size}
                  </p>
                </div>
              </div>

              {assignments.length > 0 && (
                <>
                  <h4 className="mb-2 text-sm font-semibold">{t('sample_rows')}</h4>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('worker')}</TableHead>
                          <TableHead>{t('date')}</TableHead>
                          <TableHead>{t('shift')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.slice(0, 5).map((a) => (
                          <TableRow key={a.generatedId}>
                            <TableCell>{a.workerName}</TableCell>
                            <TableCell>{unixToDateStr(a.date)}</TableCell>
                            <TableCell>{a.shiftCode}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Warnings section */}
        {warnings.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-3">
            <h4 className="mb-1 text-sm font-semibold">
              {t('parse_warnings')} ({warnings.length})
            </h4>
            <ul className="mt-1 list-disc pl-5">
              {warnings.map((w, i) => (
                <li key={i}>
                  <p className="text-sm text-muted-foreground">{w}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

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
      <NavigationHeader
        title={t('title')}
        onBack={() => router.push(`/${lng}/admin`)}
        showBackButton
      />

      <div className="py-2">
        {step === 'upload' && renderUpload()}
        {step === 'loading' && renderLoading()}
        {step === 'preview' && renderPreview()}
        {step === 'error' && renderError()}
      </div>
    </div>
  );
}
