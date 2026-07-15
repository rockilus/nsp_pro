import React from 'react';
// Components
import ShiftFieldCellColor from './shift-field-cell-color';
import ShiftFieldCellName from './shift-field-cell-name';
import ShiftFieldCellAcronym from './shift-field-cell-acronym';
import ShiftFieldCellType from './shift-field-cell-type';
import ShiftFieldCellRecuperation from './shift-field-cell-recuperation';
import ShiftFieldCellStartTime from './shift-field-cell-start-time';
import ShiftFieldCellEndTime from './shift-field-cell-end-time';
import ShiftStaffingCell from './staffing/shift-staffing-cell';
// Types
import { ShiftT } from '../../../types/shift';
import { SpecialtyT } from '@/types/specialty';

export default function ShiftFieldCell({
  lng,
  shift,
  specialties,
  shiftField,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  lng: string;
  shift: ShiftT;
  specialties: SpecialtyT[];
  shiftField: string;
  editing: { [key: string]: string };
  setEditing: React.Dispatch<React.SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  return shiftField === 'color' ? (
    <ShiftFieldCellColor shift={shift} handleUpdateShift={handleUpdateShift} />
  ) : shiftField === 'name' ? (
    <ShiftFieldCellName
      lng={lng}
      shift={shift}
      editing={editing[shift.id] === 'name'}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === 'acronym' ? (
    <ShiftFieldCellAcronym
      lng={lng}
      shift={shift}
      editing={editing[shift.id] === 'acronym'}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === 'type' ? (
    <ShiftFieldCellType shift={shift} handleUpdateShift={handleUpdateShift} />
  ) : shiftField === 'recuperation' ? (
    <ShiftFieldCellRecuperation
      lng={lng}
      shift={shift}
      editing={editing[shift.id] === 'recuperation'}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === 'start_time' ? (
    <ShiftFieldCellStartTime
      shift={shift}
      editing={editing[shift.id] === 'start_time'}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === 'end_time' ? (
    <ShiftFieldCellEndTime
      shift={shift}
      editing={editing[shift.id] === 'end_time'}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === 'staffing' ? (
    <ShiftStaffingCell
      lng={lng}
      shift={shift}
      specialties={specialties}
      handleUpdateShift={handleUpdateShift}
    />
  ) : (
    <td></td>
  );
}
