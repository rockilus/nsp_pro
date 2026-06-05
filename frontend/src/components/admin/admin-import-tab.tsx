'use client';

import React, { useCallback, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
// MUI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
// Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import WarningIcon from '@mui/icons-material/Warning';
// Components
import NavigationHeader from '@/components/common/navigation-header';
// Context
import { useTeam } from '@/context/TeamContext';
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
  const { selectedTeam, teams, loading: teamsLoading } = useTeam();
  const { user } = useAuth();

  const [step, setStep] = useState<WizardStep>('upload');
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Sync selected team from context
  React.useEffect(() => {
    if (selectedTeam?.team.id) {
      setSelectedTeamId(selectedTeam.team.id);
    }
  }, [selectedTeam]);

  // ── Upload handler ────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const teamId = selectedTeamId || selectedTeam?.team.id;
      if (!teamId) {
        setErrorMessage(t('no_team_selected'));
        setStep('error');
        return;
      }

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

        const resp = await fetch(`${env.apiUrl}/import/teams/${teamId}/preview`, {
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
    [selectedTeamId, selectedTeam, user, t],
  );

  // ── Template download ─────────────────────────────────────────────────

  const handleDownloadTemplate = useCallback(async () => {
    const teamId = selectedTeamId || selectedTeam?.team.id;
    if (!teamId) return;

    try {
      const headers = buildAuthHeaders(user);
      const resp = await fetch(`${env.apiUrl}/import/teams/${teamId}/template`, { headers });

      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_template_${teamId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download failed:', err);
    }
  }, [selectedTeamId, selectedTeam, user]);

  // ── Render: Upload step ───────────────────────────────────────────────

  const renderUpload = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 500 }}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('select_team')}
        </Typography>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '1rem',
            borderRadius: 4,
            border: '1px solid #ccc',
          }}
        >
          <option value="">{t('select_team_placeholder')}</option>
          {teams.map((tm) => (
            <option key={tm.team.id} value={tm.team.id}>
              {tm.team.name}
            </option>
          ))}
        </select>
      </Paper>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('upload_excel')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('upload_excel_hint')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            disabled={!selectedTeamId}
          >
            {t('upload_and_preview')}
            <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileUpload} />
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            disabled={!selectedTeamId}
          >
            {t('download_template')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );

  // ── Render: Loading step ──────────────────────────────────────────────

  const renderLoading = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
      <CircularProgress size={48} />
      <Typography variant="body1">{t('uploading')}</Typography>
    </Box>
  );

  // ── Render: Preview step ──────────────────────────────────────────────

  const renderPreview = () => {
    if (!previewData) return null;

    const { members, shifts, requests, assignments, errors, warnings } = previewData;

    const hasWarnings = warnings.length > 0 || errors.length > 0;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Summary bar */}
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('preview_summary')
              .replace('{workers}', String(members.length))
              .replace('{shifts}', String(shifts.length))
              .replace('{requests}', String(requests.length))
              .replace('{assignments}', String(assignments.length))}
          </Typography>
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {t('errors_found').replace('{count}', String(errors.length))}
            </Alert>
          )}
          {!errors.length && warnings.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {t('warnings_found').replace('{count}', String(warnings.length))}
            </Alert>
          )}
          {!hasWarnings && (
            <Alert severity="success" sx={{ mt: 1 }}>
              {t('no_errors')}
            </Alert>
          )}
        </Paper>

        {/* Members accordion */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Badge badgeContent={members.length} color="primary" sx={{ mr: 1 }}>
              <span />
            </Badge>
            <Typography variant="subtitle1">{t('members_tab')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('name')}</TableCell>
                    <TableCell>{t('code')}</TableCell>
                    <TableCell>{t('start_date')}</TableCell>
                    <TableCell>{t('end_date')}</TableCell>
                    <TableCell>{t('contract_hours')}</TableCell>
                    <TableCell>{t('desired_hours')}</TableCell>
                    <TableCell>{t('duty_per_month')}</TableCell>
                    <TableCell>{t('annual_leave')}</TableCell>
                    <TableCell>{t('skills')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.generatedId}>
                      <TableCell>
                        {m.name}
                        {m.warnings.length > 0 && (
                          <WarningIcon
                            color="warning"
                            fontSize="small"
                            sx={{ ml: 0.5, verticalAlign: 'middle' }}
                          />
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
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Shifts accordion */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Badge badgeContent={shifts.length} color="primary" sx={{ mr: 1 }}>
              <span />
            </Badge>
            <Typography variant="subtitle1">{t('shifts_tab')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('name')}</TableCell>
                    <TableCell>{t('code')}</TableCell>
                    <TableCell>{t('type')}</TableCell>
                    <TableCell>{t('start_time')}</TableCell>
                    <TableCell>{t('end_time')}</TableCell>
                    <TableCell>{t('duty')}</TableCell>
                    <TableCell>{t('mandatory_rest')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shifts.map((s) => (
                    <TableRow key={s.generatedId}>
                      <TableCell>
                        {s.name}
                        {s.warnings.length > 0 && (
                          <WarningIcon
                            color="warning"
                            fontSize="small"
                            sx={{ ml: 0.5, verticalAlign: 'middle' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.acronym}
                          size="small"
                          sx={{
                            backgroundColor: s.color,
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        />
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
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Requests accordion */}
        {requests.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Badge badgeContent={requests.length} color="primary" sx={{ mr: 1 }}>
                <span />
              </Badge>
              <Typography variant="subtitle1">{t('requests_tab')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('worker')}</TableCell>
                      <TableCell>{t('start_date')}</TableCell>
                      <TableCell>{t('end_date')}</TableCell>
                      <TableCell>{t('shift')}</TableCell>
                      <TableCell>{t('status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.generatedId}>
                        <TableCell>{r.workerName}</TableCell>
                        <TableCell>{unixToDateStr(r.startDate)}</TableCell>
                        <TableCell>{unixToDateStr(r.endDate)}</TableCell>
                        <TableCell>{r.shiftCode}</TableCell>
                        <TableCell>
                          <Chip label={r.status} size="small" color="success" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Schedule accordion (summary) */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Badge badgeContent={assignments.length} color="primary" sx={{ mr: 1 }}>
              <span />
            </Badge>
            <Typography variant="subtitle1">{t('schedule_tab')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle2" gutterBottom>
              {t('schedule_summary')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
              <Paper variant="outlined" sx={{ p: 1.5, minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('total_assignments')}
                </Typography>
                <Typography variant="h6">{assignments.length}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('unique_workers')}
                </Typography>
                <Typography variant="h6">
                  {new Set(assignments.map((a) => a.workerName)).size}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('unique_shifts')}
                </Typography>
                <Typography variant="h6">
                  {new Set(assignments.map((a) => a.shiftCode)).size}
                </Typography>
              </Paper>
            </Box>

            {assignments.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  {t('sample_rows')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('worker')}</TableCell>
                        <TableCell>{t('date')}</TableCell>
                        <TableCell>{t('shift')}</TableCell>
                      </TableRow>
                    </TableHead>
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
                </TableContainer>
              </>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Warnings section */}
        {warnings.length > 0 && (
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('parse_warnings')} ({warnings.length})
            </Typography>
            <Box component="ul" sx={{ mt: 0.5, pl: 2 }}>
              {warnings.map((w, i) => (
                <li key={i}>
                  <Typography variant="body2" color="text.secondary">
                    {w}
                  </Typography>
                </li>
              ))}
            </Box>
          </Paper>
        )}

        {/* Back button */}
        <Box>
          <Button variant="outlined" onClick={() => setStep('upload')}>
            {t('back_to_upload')}
          </Button>
        </Box>
      </Box>
    );
  };

  // ── Render: Error step ────────────────────────────────────────────────

  const renderError = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
      <Alert severity="error">{errorMessage}</Alert>
      <Box>
        <Button variant="outlined" onClick={() => setStep('upload')}>
          {t('back_to_upload')}
        </Button>
      </Box>
    </Box>
  );

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <div>
      <NavigationHeader
        title={t('title')}
        onBack={() => router.push(`/${lng}/admin`)}
        showBackButton
      />

      <Box sx={{ py: 2 }}>
        {step === 'upload' && renderUpload()}
        {step === 'loading' && renderLoading()}
        {step === 'preview' && renderPreview()}
        {step === 'error' && renderError()}
      </Box>
    </div>
  );
}
