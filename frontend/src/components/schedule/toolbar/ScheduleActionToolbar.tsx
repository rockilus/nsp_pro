import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Button,
  ButtonGroup,
  IconButton,
  Divider,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Popper,
  Grow,
  ClickAwayListener,
  MenuList,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { ScheduleSelectionState, SelectionScope } from '../../../types/scheduleSelection';
import { WorkerT } from '../../../types/worker';
import { ShiftT } from '../../../types/shift';
import { ScheduleT } from '../../../types/schedule';
import { useTranslation } from '../../../app/i18n/client';
import TableFilterBar from '../../table/TableFilterBar';
import { ColumnFilter, TableSort } from '../../../types/filter';

type ActionKey = 'create' | 'update' | 'toggleFixed' | 'delete' | 'saveAsTemplate';

const ACTION_LABEL_KEYS: Record<ActionKey, string> = {
  create: 'select_mode_action_create_assignments',
  update: 'select_mode_action_update_assignments',
  toggleFixed: 'select_mode_action_toggle_fixed',
  delete: 'select_mode_action_delete_assignments',
  saveAsTemplate: 'select_mode_action_save_as_template',
};
const ACTION_KEYS: ActionKey[] = ['create', 'update', 'toggleFixed', 'delete', 'saveAsTemplate'];

interface ScheduleActionToolbarProps {
  lng: string;
  selectionState: ScheduleSelectionState;
  workers: WorkerT[];
  shifts: ShiftT[];
  scheduleCampaign: ScheduleT | null;
  groupBy: 'shift' | 'worker';
  onBulkCreate: (id: string) => Promise<void>;
  onBulkUpdate: (id: string) => Promise<void>;
  onBulkToggleFixed: () => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onSaveAsTemplate?: () => void;
  onCancel: () => void;
  scope: SelectionScope;
  onScopeChange: (scope: SelectionScope) => void;
  activeFilters?: ColumnFilter[];
  activeSort?: TableSort | null;
  onRemoveFilter?: () => void;
  onRemoveSort?: () => void;
  onResetFilterSort?: () => void;
}

export function ScheduleActionToolbar({
  lng,
  selectionState,
  workers,
  shifts,
  scheduleCampaign,
  groupBy,
  onBulkCreate,
  onBulkUpdate,
  onBulkToggleFixed,
  onBulkDelete,
  onSaveAsTemplate,
  onCancel,
  scope,
  onScopeChange,
  activeFilters,
  activeSort,
  onRemoveFilter,
  onRemoveSort,
  onResetFilterSort,
}: ScheduleActionToolbarProps) {
  const { t } = useTranslation(lng, 'schedule-page');
  const [selectedAction, setSelectedAction] = useState<ActionKey>('create');
  const [entityId, setEntityId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // In shift view: pick a worker for create/update; in worker view: pick a shift
  const options = groupBy === 'shift' ? workers : shifts;
  const optionLabel = (opt: WorkerT | ShiftT) => ('name' in opt ? opt.name : (opt as ShiftT).name);
  const optionId = (opt: WorkerT | ShiftT) => opt.id;

  const cellCount = selectionState.selectedCells.length;
  // Count explicit selections; if campaignIntent is present, consider it as "has selections" too
  const assignmentCount = selectionState.selectedAssignmentIds.length;
  const hasAssignmentSelection = assignmentCount > 0 || !!selectionState.campaignIntent;
  const hasCellSelection = cellCount > 0 || !!selectionState.campaignIntent;

  const needsEntitySelect = selectedAction === 'create' || selectedAction === 'update';

  const entityLabel = groupBy === 'shift' ? 'worker' : 'shift';

  const selectHasError = validationError !== null && needsEntitySelect && !entityId;

  const validate = (): string | null => {
    switch (selectedAction) {
      case 'create':
        if (!hasCellSelection) return t('select_mode_warning_no_cell_selected');
        if (!entityId)
          return t('select_mode_warning_no_member_shift_selected', {
            entity:
              groupBy === 'shift'
                ? t('worker').toLocaleLowerCase()
                : t('shift').toLocaleLowerCase(),
          });
        return null;
      case 'update':
        if (!hasAssignmentSelection) return t('select_mode_warning_no_assignment_selected');
        if (!entityId)
          return t('select_mode_warning_no_member_shift_selected', {
            entity:
              groupBy === 'shift' ? t('worker').toLowerCase() : t('shift').toLocaleLowerCase(),
          });
        return null;
      case 'toggleFixed':
      case 'delete':
        if (!hasAssignmentSelection) return t('select_mode_warning_no_assignment_selected');
        return null;
      case 'saveAsTemplate':
        if (!hasAssignmentSelection) return t('select_mode_warning_no_assignment_selected');
        return null;
    }
  };

  const currentActionLabel = t(ACTION_LABEL_KEYS[selectedAction]);

  const actionIcon: Record<ActionKey, React.ReactNode> = {
    create: <AddIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
    update: <EditIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
    toggleFixed: (
      <span
        style={{
          width: '20px',
          height: '20px',
          fontSize: '1.0rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🔒
      </span>
    ),
    delete: <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />,
    saveAsTemplate: <SaveIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
  };

  const handleMainAction = async () => {
    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }
    if (selectedAction === 'delete' && !deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setIsLoading(true);
    try {
      switch (selectedAction) {
        case 'create':
          await onBulkCreate(entityId);
          setEntityId('');
          break;
        case 'update':
          await onBulkUpdate(entityId);
          setEntityId('');
          break;
        case 'toggleFixed':
          await onBulkToggleFixed();
          break;
        case 'delete':
          await onBulkDelete();
          setDeleteConfirm(false);
          break;
        case 'saveAsTemplate':
          onSaveAsTemplate?.();
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionSelect = (key: ActionKey) => {
    setSelectedAction(key);
    setDropdownOpen(false);
    setDeleteConfirm(false);
    setValidationError(null);
    if (key !== 'create' && key !== 'update') {
      setEntityId('');
    }
  };

  return (
    <Paper
      data-testid="schedule-action-toolbar"
      elevation={2}
      sx={{
        p: 0,
        width: '100%',
        padding: '8px 16px',
        backgroundColor: 'primary.50',
        borderTop: '1px solid',
        borderColor: 'primary.200',
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        flexWrap="wrap"
        minHeight="44px"
      >
        {/* 0. Active filter/sort chips (left-most, shown when filters are active) */}
        {((activeFilters && activeFilters.length > 0) || activeSort) && (
          <>
            <Box display="flex" alignItems="center" sx={{ flexShrink: 0 }}>
              <TableFilterBar
                inline
                lng={lng}
                filters={activeFilters ?? []}
                sort={activeSort ?? null}
                onRemoveFilter={onRemoveFilter ?? (() => {})}
                onRemoveSort={onRemoveSort ?? (() => {})}
                onResetAll={onResetFilterSort ?? (() => {})}
              />
            </Box>
            <Divider orientation="vertical" flexItem />
          </>
        )}

        {/* 1–3 + Cancel: only shown when selection mode is active */}
        {selectionState.isActive && (
          <>
            {/* 1. Selection counts */}
            <Box
              display="flex"
              alignItems="center"
              justifyContent="flex-start"
              gap={1}
              sx={{ flexShrink: 0, flex: 0.3 }}
            >
              <Typography
                variant="body2"
                data-testid="schedule-selection-counts"
                sx={{ color: 'text.secondary', minWidth: '160px', flexShrink: 0 }}
              >
                {cellCount > 0 &&
                  t('select_mode_selection_counts_cells', {
                    count: cellCount,
                    s: cellCount !== 1 ? 's' : '',
                  })}
                {cellCount > 0 && assignmentCount > 0 && ', '}
                {assignmentCount > 0 &&
                  (lng === 'es'
                    ? `${assignmentCount} ${assignmentCount !== 1 ? 'asignaciones' : 'asignación'}`
                    : t('select_mode_selection_counts_assignments', {
                        count: assignmentCount,
                        s: assignmentCount !== 1 ? 's' : '',
                      }))}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* 2. Target period (scope selector) — grows to fill available space */}
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={0.5}
              sx={{ flex: 0.4 }}
            >
              {scheduleCampaign && (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {t('select_mode_target_period')}
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    color="primary"
                    exclusive
                    value={scope}
                    onChange={(_, val) => val && onScopeChange(val)}
                    data-testid="schedule-scope-toggle-group"
                  >
                    <Tooltip title={t('select_mode_target_period_view_tooltip')}>
                      <ToggleButton
                        value="view"
                        data-testid="schedule-scope-view"
                        sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                      >
                        {t('select_mode_target_period_view')}
                      </ToggleButton>
                    </Tooltip>
                    <Tooltip title={t('select_mode_target_period_campaign_tooltip')}>
                      <ToggleButton
                        value="campaign"
                        data-testid="schedule-scope-campaign"
                        sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                      >
                        {t('select_mode_target_period_campaign')}
                      </ToggleButton>
                    </Tooltip>
                  </ToggleButtonGroup>
                </>
              )}
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* 3. Action area */}
            <Box
              display="flex"
              alignItems="center"
              justifyContent="flex-end"
              gap={1}
              sx={{ flexShrink: 0, flex: 0.4 }}
            >
              {needsEntitySelect && (
                <FormControl size="small" sx={{ minWidth: 160 }} error={selectHasError}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>
                    {groupBy === 'shift' ? t('worker') : t('shift')}
                  </InputLabel>
                  <Select
                    value={entityId}
                    label={groupBy === 'shift' ? t('worker') : t('shift')}
                    onChange={(e) => {
                      setEntityId(e.target.value);
                      setValidationError(null);
                    }}
                    sx={{ fontSize: '0.8rem' }}
                    data-testid="schedule-entity-select"
                  >
                    {options.map((opt) => (
                      <MenuItem
                        key={optionId(opt)}
                        value={optionId(opt)}
                        sx={{ fontSize: '0.8rem' }}
                        data-testid={`schedule-entity-option-${optionId(opt)}`}
                      >
                        {optionLabel(opt)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {deleteConfirm ? (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="caption" color="error">
                    {lng === 'es'
                      ? `${assignmentCount} ${assignmentCount !== 1 ? 'asignaciones' : 'asignación'}`
                      : t('select_mode_delete_confirmation', {
                          count: assignmentCount,
                          s: assignmentCount !== 1 ? 's' : '',
                        })}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    disabled={isLoading}
                    onClick={handleMainAction}
                    data-testid="schedule-delete-confirm-button"
                    sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                  >
                    {t('confirm')}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setDeleteConfirm(false)}
                    data-testid="schedule-delete-cancel-button"
                    sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                  >
                    {t('cancel')}
                  </Button>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" alignItems="flex-start">
                  <ButtonGroup
                    ref={anchorRef}
                    size="small"
                    variant="contained"
                    color={selectedAction === 'delete' ? 'error' : 'primary'}
                  >
                    <Button
                      disabled={isLoading}
                      onClick={handleMainAction}
                      data-testid="schedule-action-main-button"
                      sx={{
                        fontSize: '0.75rem',
                        textTransform: 'none',
                      }}
                    >
                      {currentActionLabel}
                    </Button>
                    <Button
                      sx={{ px: 0.5 }}
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      data-testid="schedule-action-dropdown-toggle"
                    >
                      <ArrowDropDownIcon fontSize="small" />
                    </Button>
                  </ButtonGroup>
                  {validationError && (
                    <Typography
                      variant="caption"
                      color="error"
                      data-testid="schedule-validation-error"
                      sx={{ mt: 0.5, lineHeight: 1.2 }}
                    >
                      {validationError}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            {/* Cancel */}
            <Tooltip title={t('select_mode_exit_tooltip')}>
              <IconButton
                size="small"
                onClick={onCancel}
                data-testid="schedule-close-selection-button"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      <Popper
        sx={{ zIndex: 1300 }}
        open={dropdownOpen}
        anchorEl={anchorRef.current}
        placement="top-start"
        transition
        disablePortal
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: 'center bottom' }}>
            <Paper>
              <ClickAwayListener onClickAway={() => setDropdownOpen(false)}>
                <MenuList autoFocusItem dense>
                  {ACTION_KEYS.map((key) => (
                    <MenuItem
                      key={key}
                      selected={key === selectedAction}
                      onClick={() => handleActionSelect(key)}
                      data-testid={`schedule-action-option-${key}`}
                      sx={{
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      {actionIcon[key]}
                      <Typography
                        variant="inherit"
                        color={key === 'delete' ? 'error' : 'text.primary'}
                      >
                        {t(ACTION_LABEL_KEYS[key])}
                      </Typography>
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Paper>
  );
}
