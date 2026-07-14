import React, { Dispatch, SetStateAction, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../app/i18n/client';
import { Input } from '@/components/ui/input';
// Styles
import './shift-field-cell-recuperation.css';
// Types
import { ShiftT, ShiftType } from '../../../types/shift';

dayjs.extend(utc);

export default function ShiftFieldCellRecuperation({
  lng,
  shift,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  lng: string;
  shift: ShiftT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [valueState, setValueState] = useState<number | ''>(shift.recuperationTime);

  const handleEditConfirm = () => {
    if (valueState !== shift.recuperationTime && valueState !== '') {
      handleUpdateShift({ ...shift, recuperationTime: valueState });
    } else if (valueState === '') {
      setValueState(shift.recuperationTime);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.recuperationTime);
  };

  const isDuty = shift.shiftType === ShiftType.DUTY;

  return (
    <td
      className={`py-0 text-center ${isDuty ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => isDuty && setEditing({ [shift.id]: 'recuperation' })}
    >
      <div className="cell-content-container">
        {isDuty ? (
          editing ? (
            <Input
              type="number"
              value={valueState}
              onChange={(e) => setValueState(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditConfirm();
                } else if (e.key === 'Escape') {
                  handleEditCancel();
                }
              }}
              autoFocus
              className="h-8 text-center"
              data-testid={`shift-recuperation-input-${shift.id}`}
            />
          ) : (
            shift.recuperationTime
          )
        ) : (
          <span className="not-applicable-label">{t('not_applicable')}</span>
        )}
      </div>
    </td>
  );
}
