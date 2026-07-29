import React from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
} from '@mui/material';
import { PlayArrow, Delete, Add, Remove } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from '../../../app/i18n/client';
import { ShiftT } from '../../../types/shift';
import { WorkerT } from '../../../types/worker';
import {
  AssignmentTemplateDTO,
  TemplateType,
  AssignmentTemplateEntryDTO,
  ASSIGNMENT_TEMPLATE_CONSTRAINTS,
} from '../../../types/assignment-template';

interface ScheduleTemplateViewerProps {
  lng: string;
  template: AssignmentTemplateDTO;
  workers: WorkerT[];
  shifts: ShiftT[];
  teamId: string;
  onApply: (templateId?: string) => void;
  onDelete: () => void;
  onError: (error: string) => void;
  onUpdateTemplate: (updates: Partial<AssignmentTemplateDTO>) => Promise<void>;
  onAddWeek: () => Promise<void>;
  onDeleteWeek: (weekNumber: number) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  templateUpdateLoading: boolean;
}

const DAY_ABBR = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function ScheduleTemplateViewer({
  lng,
  template,
  workers,
  shifts,
  teamId,
  onApply,
  onDelete,
  onError,
  onUpdateTemplate,
  onAddWeek,
  onDeleteWeek,
  onDeleteTemplate,
  templateUpdateLoading,
}: ScheduleTemplateViewerProps) {
  const { t } = useTranslation(lng, 'schedule-page');

  const getWorkerName = (workerId: string) =>
    workers.find((w) => w.id === workerId)?.name || workerId;

  const getShiftName = (shiftId: string) => shifts.find((s) => s.id === shiftId)?.name || shiftId;

  const templateShifts = (() => {
    const ids = new Set<string>();
    template.weeksData.forEach((w) => w.entries.forEach((e) => ids.add(e.shiftId)));
    return shifts.filter((s) => ids.has(s.id));
  })();

  const getEntriesForCell = (weekNum: number, shiftId: string, dayIndex: number) => {
    const week = template.weeksData.find((w) => w.weekNumber === weekNum);
    if (!week) return [];
    return week.entries.filter((e) => e.shiftId === shiftId && e.dayOfWeek === dayIndex);
  };

  const handleToggleWorker = async (
    weekNum: number,
    shiftId: string,
    dayIndex: number,
    workerId: string,
  ) => {
    const week = template.weeksData.find((w) => w.weekNumber === weekNum);
    if (!week) return;

    const existing = week.entries.find((e) => e.shiftId === shiftId && e.dayOfWeek === dayIndex);

    const updatedEntries = week.entries.filter(
      (e) => !(e.shiftId === shiftId && e.dayOfWeek === dayIndex),
    );

    if (existing) {
      const newWorkerIds = existing.workerIds.includes(workerId)
        ? existing.workerIds.filter((id) => id !== workerId)
        : [...existing.workerIds, workerId];

      if (newWorkerIds.length > 0) {
        updatedEntries.push({ ...existing, workerIds: newWorkerIds });
      }
    } else {
      updatedEntries.push({ shiftId, dayOfWeek: dayIndex, workerIds: [workerId] });
    }

    const updatedWeeksData = template.weeksData.map((w) =>
      w.weekNumber === weekNum ? { ...w, entries: updatedEntries } : w,
    );

    await onUpdateTemplate({ weeksData: updatedWeeksData });
  };

  const canAddWeek =
    template.templateType !== 'even_odd' &&
    template.weeksData.length < ASSIGNMENT_TEMPLATE_CONSTRAINTS.MAX_WEEKS_IN_TEMPLATE;

  const canDeleteWeek = template.weeksData.length > 1 && template.templateType !== 'even_odd';

  return (
    <Box sx={{ p: 3, overflow: 'auto', height: '100%' }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}
      >
        <Box>
          <Typography variant="h5">{template.name}</Typography>
          {template.description && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              {template.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip
              label={template.templateType === 'even_odd' ? t('even_odd') : t('standard')}
              size="small"
            />
            <Chip label={`${template.weeksData.length} ${t('weeks')}`} size="small" />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={canAddWeek ? t('add_week') : ''}>
            <span>
              <IconButton
                onClick={onAddWeek}
                disabled={!canAddWeek || templateUpdateLoading}
                size="small"
              >
                <Add />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrow />}
            onClick={() => onApply()}
            disabled={templateUpdateLoading}
            sx={{ textTransform: 'none' }}
          >
            {t('apply')}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Delete />}
            onClick={() => {
              if (window.confirm(t('confirm_delete_template'))) {
                onDeleteTemplate(template.id);
              }
            }}
            disabled={templateUpdateLoading}
            sx={{ textTransform: 'none' }}
          >
            {t('delete_template')}
          </Button>
        </Box>
      </Box>

      {template.weeksData.map((week) => (
        <Box key={week.weekNumber} sx={{ mb: 4 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              {t('week')} {week.weekNumber + 1}
              {template.templateType === 'even_odd' && (
                <Chip
                  label={week.weekNumber === 0 ? t('even_week') : t('odd_week')}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            {canDeleteWeek && (
              <IconButton
                size="small"
                onClick={() => {
                  if (window.confirm(t('confirm_delete_week'))) {
                    onDeleteWeek(week.weekNumber);
                  }
                }}
                disabled={templateUpdateLoading}
              >
                <Remove />
              </IconButton>
            )}
          </Box>

          <Box sx={{ overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>
                    {t('shift')}
                  </th>
                  {DAY_ABBR.map((day, idx) => (
                    <th
                      key={idx}
                      style={{
                        padding: 8,
                        textAlign: 'center',
                        borderBottom: '2px solid #e0e0e0',
                        backgroundColor: idx >= 5 ? 'rgba(0,0,0,0.03)' : undefined,
                        minWidth: 120,
                      }}
                    >
                      {t(day)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templateShifts.map((shift) => (
                  <tr key={shift.id}>
                    <td
                      style={{
                        padding: 8,
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 500,
                      }}
                    >
                      {shift.name}
                    </td>
                    {DAY_ABBR.map((day, dayIdx) => {
                      const entries = getEntriesForCell(week.weekNumber, shift.id, dayIdx);
                      const workerIds = entries.flatMap((e) => e.workerIds);

                      return (
                        <td
                          key={dayIdx}
                          style={{
                            padding: 4,
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: dayIdx >= 5 ? 'rgba(0,0,0,0.02)' : undefined,
                            verticalAlign: 'top',
                            minHeight: 60,
                          }}
                        >
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {workerIds.map((wid) => (
                              <Chip
                                key={wid}
                                label={getWorkerName(wid)}
                                size="small"
                                onDelete={() =>
                                  handleToggleWorker(week.weekNumber, shift.id, dayIdx, wid)
                                }
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                            <Tooltip title={t('add_worker')}>
                              <Button
                                size="small"
                                sx={{
                                  minWidth: 'auto',
                                  padding: '2px 4px',
                                  fontSize: '0.7rem',
                                  textTransform: 'none',
                                }}
                                onClick={() => {
                                  const wid = window.prompt(t('enter_worker_id'));
                                  if (wid) {
                                    handleToggleWorker(week.weekNumber, shift.id, dayIdx, wid);
                                  }
                                }}
                              >
                                +
                              </Button>
                            </Tooltip>
                          </Box>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
