import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
// Components
import { validateLinkShift } from './validate-link-shift';
// Styles
import './add-link-shift.css';
// Types
import { LinkShiftT, ShiftT, ShiftType } from '../../../types/shift';

dayjs.extend(utc);

export default function AddLinkShift({
  lng,
  teamId,
  shifts,
  linkShifts,
  shiftSelected1,
  shiftSelected2,
  setShiftSelected1,
  setShiftSelected2,
  handleAddLinkShift,
}: {
  lng: string;
  teamId: string;
  shifts: ShiftT[];
  linkShifts: LinkShiftT[];
  shiftSelected1: ShiftT | null;
  shiftSelected2: ShiftT | null;
  setShiftSelected1: (shift: ShiftT | null) => void;
  setShiftSelected2: (shift: ShiftT | null) => void;
  handleAddLinkShift: (linkShift: LinkShiftT) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const validateMessageTranslation = {
    missing_shift: t('message_missing_shift'),
    duplicate_shift: t('message_duplicate_shift'),
    shift_not_found: t('message_shift_not_found'),
    shifts_overlap: t('message_shifts_overlap'),
    shifts_already_linked: t('message_shifts_already_linked'),
  };

  const handleShift1Change = (event: SelectChangeEvent) => {
    const shiftSelected = shifts.find((shift) => shift.id === event.target.value);
    if (!shiftSelected) {
      return;
    }
    setShiftSelected1(shiftSelected);
    setShiftSelected2(null);
    setValidationMessage(null);
  };

  const handleShift2Change = (event: SelectChangeEvent) => {
    const shiftSelected = shifts.find((shift) => shift.id === event.target.value);
    if (!shiftSelected) {
      return;
    }
    setShiftSelected2(shiftSelected);
    setValidationMessage(null);
  };

  const handleCreateLinkShift = () => {
    if (!shiftSelected1 || !shiftSelected2) {
      setValidationMessage(validateMessageTranslation.missing_shift);
      return;
    }
    const newLinkShift = {
      id: '',
      teamId: teamId,
      shiftIds: [shiftSelected1.id, shiftSelected2.id],
    };
    const validationResult = validateLinkShift(
      newLinkShift,
      shifts.filter((s) => newLinkShift.shiftIds.includes(s.id)),
      linkShifts,
    );
    if (!validationResult.isValid) {
      setValidationMessage(
        validateMessageTranslation[
          validationResult.validationMessage as keyof typeof validateMessageTranslation
        ] || t('message_unknown_error'),
      );
      return;
    }

    handleAddLinkShift(newLinkShift);
    setShiftSelected1(null);
    setShiftSelected2(null);
  };

  const shiftsForShift1 = shifts.filter((shift) => shift.shiftType === ShiftType.NORMAL);

  const referenceDate = dayjs.utc().startOf('day');
  const shiftTimes = shiftsForShift1.reduce(
    (acc, shift) => {
      const startTime = dayjs
        .utc(shift.startTime)
        .set('year', referenceDate.year())
        .set('month', referenceDate.month())
        .set('date', referenceDate.date());
      let endTime = dayjs
        .utc(shift.endTime)
        .set('year', referenceDate.year())
        .set('month', referenceDate.month())
        .set('date', referenceDate.date());
      if (endTime.isBefore(startTime)) {
        endTime = endTime.add(1, 'day');
      }
      acc[shift.id] = { startTime, endTime };
      return acc;
    },
    {} as Record<string, { startTime: dayjs.Dayjs; endTime: dayjs.Dayjs }>,
  );

  const shiftsForShift2 = shiftSelected1
    ? shiftsForShift1.filter((shift) => {
        const shift1Times = shiftTimes[shiftSelected1.id];
        const shift2Times = shiftTimes[shift.id];
        return (
          shift.id !== shiftSelected1.id &&
          !(
            shift2Times.startTime.isBefore(shift1Times.endTime) &&
            shift2Times.endTime.isAfter(shift1Times.startTime)
          )
        );
      })
    : [];

  const renderShift1Select = () => (
    <React.Fragment>
      <div className="ls-select-shift">
        <Select
          value={shiftSelected1 ? shiftSelected1.id : ''}
          onChange={handleShift1Change}
          displayEmpty
          fullWidth
          sx={{ width: '230px' }}
        >
          <MenuItem value="" disabled>
            {t('select_a_shift')}
          </MenuItem>
          {shiftsForShift1.map((shift) => (
            <MenuItem key={shift.id} value={shift.id}>
              <div className="ls-shift-select-item">
                <span className="ls-shift-name">{shift.name}</span>
                <span className="ls-shift-times">
                  {shift
                    ? `${shift.startTime.format('HH:mm')} - ${shift.endTime.format('HH:mm')}`
                    : ''}
                </span>
              </div>
            </MenuItem>
          ))}
        </Select>
      </div>
    </React.Fragment>
  );

  const renderShift2Select = () => (
    <React.Fragment>
      <div className="ls-select-shift">
        <Select
          value={shiftSelected2 ? shiftSelected2.id : ''}
          onChange={handleShift2Change}
          displayEmpty
          fullWidth
          sx={{ width: '230px' }}
          disabled={!shiftSelected1}
        >
          <MenuItem value="" disabled>
            {t('select_a_shift')}
          </MenuItem>
          {shiftsForShift2.map((shift) => (
            <MenuItem key={shift.id} value={shift.id}>
              <div className="ls-shift-select-item">
                <span className="ls-shift-name">{shift.name}</span>
                <span className="ls-shift-times">
                  {shift
                    ? `${shift.startTime.format('HH:mm')} - ${shift.endTime.format('HH:mm')}`
                    : ''}
                </span>
              </div>
            </MenuItem>
          ))}
        </Select>
      </div>
    </React.Fragment>
  );

  return (
    <React.Fragment>
      <div className="add-link-shift-container">
        {renderShift1Select()}
        <SyncAltIcon sx={{ marginX: 1, fontSize: 16, color: 'grey' }} />
        {renderShift2Select()}
        <Button variant="contained" onClick={handleCreateLinkShift}>
          {t('link')}
        </Button>
      </div>
      {validationMessage ? (
        <div className="validation-message-container">
          <span className="validation-message">{validationMessage}</span>
        </div>
      ) : (
        <div className="validation-message-container" />
      )}
    </React.Fragment>
  );
}
