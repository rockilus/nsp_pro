import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import Box from '@mui/material/Box';
// Components
import PopoverSelectShifts from './popover-select-shifts';
import { blockDislayValue } from './block-display';
import ShiftOptionsEdit from './shift-options-edit';
// Utils
import {
  expandBoolDimOptions,
  groupByCategoryName,
} from '../../constraints/shift-worker-option-utils/shift-worker-option-utils';
import { getShiftWorkerOptionDisplayText } from '../../../utils/shift-worker-option-display';
// Types
import { ShiftWorkerOptionT } from '../../../types/constraint';
import { WorkerT } from '../../../types/worker';
import { ShiftT } from '../../../types/shift';

const ShiftOptionsDisplay = ({
  lng,
  selectedShifts,
  statsShiftOptions,
  workers,
  shifts,
  disabled,
  handleEditSelectedShifts,
}: {
  lng: string;
  selectedShifts: ShiftWorkerOptionT[];
  statsShiftOptions: ShiftWorkerOptionT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  disabled: boolean;
  handleEditSelectedShifts: (selectedShifts: ShiftWorkerOptionT[]) => void;
}) => {
  const { t } = useTranslation(lng, 'stats-page');

  const [open, setOpen] = useState(false);
  const [selectedShiftsState, setSelectedShiftsState] =
    useState<ShiftWorkerOptionT[]>(selectedShifts);

  // Memoize the grouped shift options computation
  const groupedStatsShiftOptions = useMemo(
    () => groupByCategoryName(expandBoolDimOptions(statsShiftOptions)),
    [statsShiftOptions],
  );

  // Memoize the block display content
  const blockDisplayContent = useMemo(() => {
    return (
      <div className="block-display" data-testid="shift-options-display-block">
        {selectedShiftsState.length !== 0
          ? blockDislayValue(
              selectedShiftsState
                .map((item) =>
                  typeof item === 'object' && 'name' in item
                    ? getShiftWorkerOptionDisplayText(item, workers, shifts, t('not'))
                    : '',
                )
                .join(', '),
              disabled,
            )
          : t('select_shift')}
      </div>
    );
  }, [selectedShiftsState, workers, shifts, disabled, t]);

  const handleConfirmEditSelectedShifts = useCallback(() => {
    if (disabled) {
      return;
    }
    handleEditSelectedShifts(selectedShiftsState);
    setOpen(false);
  }, [disabled, handleEditSelectedShifts, selectedShiftsState]);

  const handleEditSelectedShiftsState = useCallback((selectedShifts: ShiftWorkerOptionT[]) => {
    setSelectedShiftsState(selectedShifts);
  }, []);

  const handleOpenPopover = useCallback(() => {
    if (disabled) {
      return;
    }
    setOpen(true);
  }, [disabled]);

  const handleClosePopover = useCallback(() => {
    if (disabled) {
      return;
    }
    handleEditSelectedShifts(selectedShiftsState);
    setOpen(false);
  }, [disabled, handleEditSelectedShifts, selectedShiftsState]);

  return (
    <PopoverSelectShifts
      buttonContent={blockDisplayContent}
      content={
        <ShiftOptionsEdit
          lng={lng}
          selectedShifts={selectedShiftsState}
          statsShiftOptions={groupedStatsShiftOptions}
          workers={workers}
          shifts={shifts}
          handleConfirmEditSelectedShifts={handleConfirmEditSelectedShifts}
          handleEditSelectedShiftsState={handleEditSelectedShiftsState}
        />
      }
      open={open}
      disabled={disabled}
      handleOpenPopover={handleOpenPopover}
      handleClosePopover={handleClosePopover}
    />
  );
};

ShiftOptionsDisplay.displayName = 'ShiftOptionsDisplay';

export default React.memo(ShiftOptionsDisplay);
