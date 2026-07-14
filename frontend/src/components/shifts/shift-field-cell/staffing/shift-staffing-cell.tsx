import React, { useState } from 'react';
import { useTranslation } from '../../../../app/i18n/client';
// Components
import ShiftStaffingCellEdit from './shift-staffing-cell-edit';
import PopoverAnchorElOver from '../../../inputs/popover-anchor-el-over';
// Styles
import './shift-staffing-cell.css';
// Types
import { SpecialtyT } from '@/types/specialty';
import { ShiftT, StaffingT } from '../../../../types/shift';

type AdjustStaffingButtonsProps = {
  staffing: StaffingT;
  onIncrease: (event: React.SyntheticEvent, staffing: StaffingT) => void;
  onDecrease: (event: React.SyntheticEvent, staffing: StaffingT) => void;
};

const AdjustStaffingButtons = ({
  staffing,
  onIncrease,
  onDecrease,
}: AdjustStaffingButtonsProps) => {
  return (
    <div className="adjust-staffing-buttons">
      <div
        role="button"
        tabIndex={0}
        className="adjust-button adjust-button-top"
        onClick={(e) => onIncrease(e, staffing)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onIncrease(e, staffing);
        }}
      >
        +
      </div>
      <div
        role="button"
        tabIndex={0}
        className="adjust-button adjust-button-bottom"
        onClick={(e) => onDecrease(e, staffing)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onDecrease(e, staffing);
        }}
      >
        –
      </div>
    </div>
  );
};

type StaffingChipProps = {
  staffing: StaffingT;
  specialties: SpecialtyT[];
  t: (key: string) => string;
  onIncrease: (event: React.SyntheticEvent, staffing: StaffingT) => void;
  onDecrease: (event: React.SyntheticEvent, staffing: StaffingT) => void;
};

const StaffingChip = ({ staffing, specialties, onIncrease, onDecrease, t }: StaffingChipProps) => {
  const specialty = specialties.find((s) => s.id === staffing.specialtyId);
  return (
    <div className="chip">
      <span className="chip-label">{`${
        staffing.specialtyId === null ? t('any') : specialty ? specialty.name : 'Name not found'
      }: ${staffing.staffing}`}</span>
      <span className="chip-delete">
        <AdjustStaffingButtons
          staffing={staffing}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
        />
      </span>
    </div>
  );
};

type ButtonContentProps = {
  staffingList: StaffingT[];
  specialties: SpecialtyT[];
  t: (key: string) => string;
  onIncrease: (event: React.SyntheticEvent, staffing: StaffingT) => void;
  onDecrease: (event: React.SyntheticEvent, staffing: StaffingT) => void;
};

const ButtonContent = ({
  staffingList,
  specialties,
  t,
  onIncrease,
  onDecrease,
}: ButtonContentProps) => {
  return (
    <div className="chips-container">
      {staffingList.map((staffing, index) => (
        <StaffingChip
          key={staffing.specialtyId || index}
          staffing={staffing}
          specialties={specialties}
          t={t}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
        />
      ))}
    </div>
  );
};

export default function ShiftStaffingCell({
  lng,
  shift,
  specialties,
  handleUpdateShift,
}: {
  lng: string;
  shift: ShiftT;
  specialties: SpecialtyT[];
  handleUpdateShift: (shift: ShiftT) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<StaffingT[]>(shift.staffing);

  const specialtyAny: SpecialtyT = {
    id: 'any_specialty_id',
    teamId: '',
    name: t('any'),
    deleted: false,
  };

  const buildSelectedSpecialties = () => {
    return valueState
      .map((v) => {
        if (v.specialtyId === null) {
          return specialtyAny;
        }
        return specialties.find((s) => s.id === v.specialtyId);
      })
      .filter((specialty) => specialty !== undefined);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddStaffing = (specialty: SpecialtyT) => {
    const updatedValue = [
      ...valueState,
      {
        specialtyId: specialty.id === 'any_specialty_id' ? null : specialty.id,
        staffing: 1,
      },
    ];
    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const handleRemoveStaffing = (specialty: SpecialtyT) => {
    const specialtyIdToRemove = specialty.id === 'any_specialty_id' ? null : specialty.id;
    const updatedValue = valueState.filter((v) => v.specialtyId !== specialtyIdToRemove);
    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const handleIncreaseStaffing = (event: React.SyntheticEvent, staffing: StaffingT) => {
    event.stopPropagation();
    const updatedValue = valueState.map((v) => {
      if (v.specialtyId === staffing.specialtyId) {
        return {
          ...v,
          staffing: v.staffing + 1,
        };
      }
      return v;
    });

    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const handleDecreaseStaffing = (event: React.SyntheticEvent, staffing: StaffingT) => {
    event.stopPropagation();
    const updatedValue = valueState.map((v) => {
      if (v.specialtyId === staffing.specialtyId) {
        return {
          ...v,
          staffing: Math.max(0, v.staffing - 1),
        };
      }
      return v;
    });
    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  return (
    <td className="cursor-pointer py-0" data-testid={`shift-staffing-cell-${shift.id}`}>
      <PopoverAnchorElOver
        buttonContent={
          <ButtonContent
            staffingList={shift.staffing}
            specialties={specialties}
            t={t}
            onIncrease={handleIncreaseStaffing}
            onDecrease={handleDecreaseStaffing}
          />
        }
        content={
          <ShiftStaffingCellEdit
            selectedSpecialties={buildSelectedSpecialties()}
            specialties={[specialtyAny, ...specialties]}
            handleAddStaffing={handleAddStaffing}
            handleRemoveStaffing={handleRemoveStaffing}
            handleClose={handleClose}
          />
        }
        open={open}
        setOpen={setOpen}
      />
    </td>
  );
}
