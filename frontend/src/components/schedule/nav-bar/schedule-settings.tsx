import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import {
  IconButton,
  Popover,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// Components
import ScheduleSettingsView from './schedule-settings-view';
// Styles
import '../../../styles/text-styles.css';
// Types
import {
  ScheduleT,
  DuplicateRequestT,
  ScheduleViewSettingsT,
  ExportOptionsT,
  ExportPeriodOptions,
  periodDateT,
} from '../../../types/schedule';
import { OccurrenceType } from '@/types/recurrence';
import { TeamMembershipRole, TeamWithMembership } from '../../../types/team';

dayjs.extend(utc);

interface ScheduleSettingsProps {
  lng: string;
  teamWithMembership: TeamWithMembership;
  campaign: ScheduleT | null;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  scheduleViewSettings: ScheduleViewSettingsT;
  onToggleSelectionMode: () => void;
  handleSendDuplicateRequest: (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string,
  ) => void;
  updateScheduleViewSettings: (newSettings: ScheduleViewSettingsT) => void;
  handleChangeTimeFrame: (newTimeFrame: 'week' | 'month') => void;
  handleExportSchedule?: (options: ExportOptionsT) => void;
  periodDates?: periodDateT[];
  onOpenRotations?: () => void;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
  lng,
  teamWithMembership,
  campaign,
  startDate,
  endDate,
  scheduleViewSettings,
  onToggleSelectionMode,
  handleSendDuplicateRequest,
  updateScheduleViewSettings,
  handleChangeTimeFrame,
  handleExportSchedule,
  periodDates = [],
  onOpenRotations,
}) => {
  const { t } = useTranslation(lng, 'schedule-page');

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isDuplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [isWarningDialogOpen, setWarningDialogOpen] = useState(false);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportOptionsState, setExportOptionsState] = useState<ExportOptionsT>(
    campaign
      ? {
          periodOption: ExportPeriodOptions.CAMPAIGN,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        }
      : {
          periodOption: ExportPeriodOptions.CURRENT_SELECTION,
          startDate: periodDates.length > 0 ? periodDates[0].date : dayjs.utc(),
          endDate: periodDates.length > 0 ? periodDates[periodDates.length - 1].date : dayjs.utc(),
        },
  );
  const [targetWeek, setTargetWeek] = useState<{
    label: string;
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
  } | null>(null);
  const [occurrenceType, setOccurrenceType] = useState<OccurrenceType>(OccurrenceType.ASSIGNMENT);
  const [copyAssignments, setCopyAssignments] = useState(!teamWithMembership.team.useSolver);
  const [copyDemands, setCopyDemands] = useState(false);
  const [copyAssignmentsError, setCopyAssignmentsError] = useState(false);
  const [copyDemandsError, setCopyDemandsError] = useState(false);

  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const handleDuplicateWeek = () => {
    setDuplicateDialogOpen(true);
    handleClosePopover();
  };

  const handleOpenExportDialog = () => {
    setExportOptionsState(
      campaign
        ? {
            periodOption: ExportPeriodOptions.CAMPAIGN,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
          }
        : {
            periodOption: ExportPeriodOptions.CURRENT_SELECTION,
            startDate: periodDates.length > 0 ? periodDates[0].date : dayjs.utc(),
            endDate:
              periodDates.length > 0 ? periodDates[periodDates.length - 1].date : dayjs.utc(),
          },
    );
    setExportDialogOpen(true);
    handleClosePopover();
  };

  const handleCloseExportDialog = () => setExportDialogOpen(false);

  const handleConfirmExport = () => {
    handleExportSchedule?.(exportOptionsState);
    setExportDialogOpen(false);
  };

  const handleConfirmDuplicate = async () => {
    if (!targetWeek || !campaign) return;

    const duplicateRequest: DuplicateRequestT = {
      sourcePeriod: {
        startDate: startDate,
        endDate: endDate,
      },
      targetPeriod: {
        startDate: targetWeek.startDate,
        endDate: targetWeek.endDate,
      },
      options: {
        copyAssignments: copyAssignments,
        copyDemands: copyDemands,
      },
    };

    // Validation: At least one checkbox should be selected
    if (!copyAssignments && !copyDemands) {
      // Raise an error to the user in the checkbox components
      setCopyAssignmentsError(!copyAssignments);
      setCopyDemandsError(!copyDemands);
      return;
    }

    // Reset errors if validation passes
    setCopyAssignmentsError(false);
    setCopyDemandsError(false);

    await handleSendDuplicateRequest(duplicateRequest, campaign.id, campaign.teamId);
    setWarningDialogOpen(false);
    setDuplicateDialogOpen(false);
    setTargetWeek(null);
    setOccurrenceType(OccurrenceType.ASSIGNMENT);
    setAnchorEl(null);
  };

  const handleCloseWarningDialog = () => {
    setTargetWeek(null);
    setWarningDialogOpen(false);
  };

  const weekOptions = useMemo(() => {
    if (!campaign) return [];

    const campaignStart = campaign.startDate.startOf('day');
    const campaignEnd = campaign.endDate.endOf('day');

    const weeks = [];
    let currentStart = campaignStart;

    while (currentStart.isSameOrBefore(campaignEnd)) {
      const currentEnd = dayjs.min(currentStart.endOf('week').add(1, 'day'), campaignEnd);
      if (!(currentStart.isBefore(endDate) && currentEnd.isAfter(startDate))) {
        weeks.push({
          label: `${currentStart.format('D MMMM YYYY')} - ${currentEnd.format('D MMMM YYYY')}`,
          startDate: currentStart,
          endDate: currentEnd,
        });
      }
      currentStart = currentEnd.add(1, 'day');
    }

    return weeks;
  }, [campaign, startDate, endDate]);

  return (
    <div>
      <IconButton data-testid="schedule-settings-button" onClick={handleOpenPopover}>
        <SettingsIcon />
      </IconButton>
      <Popover
        data-testid="schedule-settings-popover"
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div style={{ padding: '16px', minWidth: '300px' }}>
          <ScheduleSettingsView
            lng={lng}
            teamWithMembership={teamWithMembership}
            scheduleViewSettings={scheduleViewSettings}
            updateScheduleViewSettings={updateScheduleViewSettings}
            handleChangeTimeFrame={handleChangeTimeFrame}
          />

          {/* Tools Section */}
          {teamWithMembership.membership.role === TeamMembershipRole.OWNER && (
            <div>
              <h4 className="subtitle settings-view-title" style={{ margin: '0 0 8px 0' }}>
                {t('tools')}
              </h4>
              <Tooltip title={t('select_mode_tooltip')}>
                <MenuItem
                  data-testid="settings-selection-mode-button"
                  onClick={() => {
                    onToggleSelectionMode();
                    handleClosePopover();
                  }}
                  sx={{ fontSize: '0.8rem' }}
                >
                  {t('select')}
                </MenuItem>
              </Tooltip>
              <MenuItem
                data-testid="settings-duplicate-week-button"
                onClick={handleDuplicateWeek}
                disabled={
                  !campaign ||
                  scheduleViewSettings.timeFrame !== 'week' ||
                  endDate.diff(startDate, 'day') + 1 !== 7 ||
                  startDate.day() !== 1
                }
                sx={{ fontSize: '0.8rem' }}
              >
                {t('duplicate_week')}
              </MenuItem>
              {handleExportSchedule && (
                <MenuItem
                  data-testid="settings-export-excel-button"
                  onClick={handleOpenExportDialog}
                  sx={{ fontSize: '0.8rem' }}
                >
                  {t('export_to_excel')}
                </MenuItem>
              )}
              {onOpenRotations && (
                <MenuItem
                  data-testid="settings-rotations-button"
                  onClick={() => {
                    onOpenRotations();
                    handleClosePopover();
                  }}
                  sx={{ fontSize: '0.8rem' }}
                >
                  {t('rotations')}
                </MenuItem>
              )}
            </div>
          )}
        </div>
      </Popover>

      <Dialog
        data-testid="duplicate-week-dialog"
        open={isDuplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
      >
        <DialogTitle>{t('duplicate_week')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel>{t('target_week')}</InputLabel>
            <Select
              value={targetWeek?.label || ''}
              onChange={(e) => {
                const selectedWeek = weekOptions.find((week) => week.label === e.target.value);
                setTargetWeek(selectedWeek || null);
              }}
              displayEmpty
              renderValue={(selected) =>
                (selected as string) ? (
                  (selected as string)
                ) : (
                  <em style={{ color: '#6b6b6b' }}>{t('target_week')}</em>
                )
              }
              inputProps={{ 'aria-label': t('target_week') }}
              style={{ minWidth: '300px' }}
            >
              {/* optional disabled placeholder item for a11y */}
              <MenuItem disabled value="">
                <em>{t('target_week')}</em>
              </MenuItem>
              {weekOptions.map((week, index) => (
                <MenuItem key={`${index}-${week.label}`} value={week.label}>
                  {week.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {teamWithMembership.team.useSolver && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={copyAssignments}
                    onChange={(e) => setCopyAssignments(e.target.checked)}
                  />
                }
                label={
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: copyAssignmentsError ? 'red' : 'inherit',
                    }}
                  >
                    {t('assignment')}
                  </span>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={copyDemands}
                    onChange={(e) => setCopyDemands(e.target.checked)}
                  />
                }
                label={
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: copyDemandsError ? 'red' : 'inherit',
                    }}
                  >
                    {t('demand')}
                  </span>
                }
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setTargetWeek(null);
              setDuplicateDialogOpen(false);
            }}
            sx={{ textTransform: 'none' }}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={() => {
              if (targetWeek) {
                setWarningDialogOpen(true);
              }
            }}
            color="primary"
            variant="contained"
            disabled={!targetWeek || (!copyAssignments && !copyDemands)}
            sx={{ textTransform: 'none' }}
          >
            {t('duplicate')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isWarningDialogOpen} onClose={handleCloseWarningDialog}>
        <DialogTitle>{t('duplicate_week')}</DialogTitle>
        <DialogContent>
          {t('duplicate_warning_part_1')} <b>{targetWeek?.label}</b> {t('duplicate_warning_part_2')}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseWarningDialog} sx={{ textTransform: 'none' }}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirmDuplicate}
            color="primary"
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            {t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={isExportDialogOpen}
        onClose={handleCloseExportDialog}
        data-testid="export-dialog"
        PaperProps={{
          style: { boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)', padding: 20, width: 500 },
        }}
      >
        <DialogContent>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{t('export_to_excel')}</span>
            <IconButton
              aria-label="close"
              onClick={handleCloseExportDialog}
              data-testid="export-dialog-close-button"
            >
              <CloseIcon />
            </IconButton>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.875rem' }}>{t('period')}:</span>
            <ToggleButtonGroup
              color="primary"
              value={exportOptionsState.periodOption}
              exclusive
              data-testid="export-period-toggle-group"
              onChange={(_event: React.MouseEvent<HTMLElement>, newAlignment: number) => {
                if (newAlignment !== null) {
                  setExportOptionsState((prev) => ({ ...prev, periodOption: newAlignment }));
                  if (
                    newAlignment === ExportPeriodOptions.CURRENT_SELECTION &&
                    periodDates.length > 0
                  ) {
                    setExportOptionsState((prev) => ({
                      ...prev,
                      startDate: periodDates[0].date,
                      endDate: periodDates[periodDates.length - 1].date,
                    }));
                  } else if (newAlignment === ExportPeriodOptions.CAMPAIGN && campaign) {
                    setExportOptionsState((prev) => ({
                      ...prev,
                      startDate: dayjs.utc(campaign.startDate),
                      endDate: dayjs.utc(campaign.endDate),
                    }));
                  }
                }
              }}
            >
              {[
                { value: ExportPeriodOptions.CURRENT_SELECTION, label: t('current_selection') },
                { value: ExportPeriodOptions.CAMPAIGN, label: t('campaign') },
                { value: ExportPeriodOptions.ALL, label: t('all') },
                { value: ExportPeriodOptions.CUSTOM, label: t('custom') },
              ].map((c) => (
                <ToggleButton
                  key={c.value}
                  disabled={c.value === ExportPeriodOptions.CAMPAIGN && !campaign}
                  value={c.value}
                  data-testid={`export-period-option-${c.value}`}
                  sx={{ textTransform: 'none', height: '25px', fontSize: '0.8rem' }}
                >
                  {c.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <DatePicker
              disabled={exportOptionsState.periodOption !== ExportPeriodOptions.CUSTOM}
              value={exportOptionsState.startDate}
              onChange={(newValue) =>
                setExportOptionsState((prev) => ({
                  ...prev,
                  startDate: newValue
                    ? dayjs.utc(newValue).startOf('day')
                    : dayjs.utc().startOf('day'),
                }))
              }
              slotProps={{
                textField: { inputProps: { 'data-testid': 'export-start-date-picker' } },
              }}
              sx={{
                width: '160px',
                '& .MuiOutlinedInput-input': { fontSize: '0.875rem', height: '35px', paddingY: 0 },
              }}
            />
            <DatePicker
              disabled={exportOptionsState.periodOption !== ExportPeriodOptions.CUSTOM}
              value={exportOptionsState.endDate}
              onChange={(newValue) =>
                setExportOptionsState((prev) => ({
                  ...prev,
                  endDate: newValue
                    ? dayjs.utc(newValue).startOf('day')
                    : dayjs.utc().startOf('day'),
                }))
              }
              slotProps={{ textField: { inputProps: { 'data-testid': 'export-end-date-picker' } } }}
              sx={{
                width: '160px',
                '& .MuiOutlinedInput-input': { fontSize: '0.875rem', height: '35px', paddingY: 0 },
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              onClick={handleConfirmExport}
              variant="contained"
              data-testid="confirm-export-button"
              sx={{ textTransform: 'none' }}
            >
              {t('export_to_excel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleSettings;
