import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Box,
  Typography,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from '../../../app/i18n/client';
import { ShiftT } from '../../../types/shift';
import {
  AssignmentTemplateDTO,
  ApplyAssignmentTemplateToDateRangeDTO,
  AssignmentTemplateApplicationResult,
  ASSIGNMENT_TEMPLATE_CONSTRAINTS,
} from '../../../types/assignment-template';

dayjs.extend(utc);

interface ScheduleTemplateApplicationToRangeDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  template: AssignmentTemplateDTO;
  teamId: string;
  shifts: ShiftT[];
  onApplicationComplete: (result: AssignmentTemplateApplicationResult) => void;
  onError: (error: string) => void;
  onApplyTemplate: (
    request: ApplyAssignmentTemplateToDateRangeDTO,
  ) => Promise<AssignmentTemplateApplicationResult>;
}

export function ScheduleTemplateApplicationToRangeDialog({
  lng,
  open,
  onClose,
  template,
  teamId,
  shifts,
  onApplicationComplete,
  onError,
  onApplyTemplate,
}: ScheduleTemplateApplicationToRangeDialogProps) {
  const { t } = useTranslation(lng, 'assignment-templates');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [shiftFilter, setShiftFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const templateShifts = (() => {
    const ids = new Set<string>();
    template.weeksData.forEach((w) => w.entries.forEach((e) => ids.add(e.shiftId)));
    return shifts.filter((s) => ids.has(s.id));
  })();

  const handleApply = async () => {
    setValidationError(null);

    if (!startDate || !endDate) {
      setValidationError(t('date_range_required'));
      return;
    }

    if (endDate.isBefore(startDate)) {
      setValidationError(t('end_date_before_start_date'));
      return;
    }

    const daysDiff = endDate.diff(startDate, 'day');
    if (daysDiff > ASSIGNMENT_TEMPLATE_CONSTRAINTS.MAX_DATE_RANGE_DAYS) {
      setValidationError(t('date_range_too_long'));
      return;
    }

    setIsLoading(true);
    try {
      const request: ApplyAssignmentTemplateToDateRangeDTO = {
        templateId: template.id,
        startDate: startDate.startOf('day').unix(),
        endDate: endDate.endOf('day').unix(),
        overwriteExisting,
        shiftId: shiftFilter || undefined,
      };

      const result = await onApplyTemplate(request);
      onApplicationComplete(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('template_application_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const estimatedAssignments = (() => {
    if (!startDate || !endDate) return 0;
    let count = 0;
    let current = startDate;
    const end = endDate;
    let templateWeek = 0;
    const weekCycleLen = template.weeksData.length;

    if (template.templateType === 'even_odd') {
      const startMonday = current.startOf('isoWeek');
      const daysSinceEpoch = startMonday.diff(dayjs.utc('1970-01-05'), 'day');
      const weekNumber = Math.floor(daysSinceEpoch / 7);
      templateWeek = weekNumber % 2 === 0 ? 0 : 1;
    }

    while (current.isSameOrBefore(end, 'day')) {
      const weekday = current.isoWeekday() - 1;
      const weekData = template.weeksData[templateWeek];
      if (weekData) {
        const dayEntries = weekData.entries.filter((e) => e.dayOfWeek === weekday);
        count += dayEntries.reduce((s, e) => s + e.workerIds.length, 0);
      }
      current = current.add(1, 'day');
      if (current.isoWeekday() === 1) {
        if (template.templateType === 'standard') {
          templateWeek = (templateWeek + 1) % weekCycleLen;
        } else {
          templateWeek = 1 - templateWeek;
        }
      }
    }
    return count;
  })();

  const totalDays = startDate && endDate ? endDate.diff(startDate, 'day') + 1 : 0;

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      data-testid="schedule-template-apply-dialog"
    >
      <DialogTitle>{t('apply_template')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {validationError && <Alert severity="error">{validationError}</Alert>}

          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              {template.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {template.templateType === 'even_odd'
                ? t('even_odd_template_explanation')
                : t('standard_template_explanation')}
            </Typography>
            <Chip
              label={`${template.weeksData.length} ${t('weeks')}`}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label={t('start_date')}
              value={startDate}
              onChange={setStartDate}
              disablePast
              slotProps={{
                textField: { size: 'small', fullWidth: true, sx: { flex: 1 } },
              }}
            />
            <DatePicker
              label={t('end_date')}
              value={endDate}
              onChange={setEndDate}
              disablePast
              minDate={startDate || undefined}
              slotProps={{
                textField: { size: 'small', fullWidth: true, sx: { flex: 1 } },
              }}
            />
          </Box>

          {templateShifts.length > 0 && (
            <FormControl size="small">
              <InputLabel>{t('filter_by_shift')}</InputLabel>
              <Select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                label={t('filter_by_shift')}
              >
                <MenuItem value="">{t('all_shifts')}</MenuItem>
                {templateShifts.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">{t('overwrite_existing')}</Typography>
                {overwriteExisting && (
                  <Typography variant="caption" color="warning.main">
                    {t('overwrite_warning')}
                  </Typography>
                )}
              </Box>
            }
          />

          <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="body2">
              {t('total_days')}: {totalDays || '-'}
            </Typography>
            <Typography variant="body2">
              {t('estimated_assignments')}: {estimatedAssignments}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading} sx={{ textTransform: 'none' }}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={isLoading || !startDate || !endDate}
          sx={{ textTransform: 'none' }}
          data-testid="submit-template-apply-btn"
        >
          {isLoading ? t('applying') : t('apply')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
