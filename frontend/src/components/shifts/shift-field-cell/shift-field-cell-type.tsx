import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShiftT, ShiftLeaveType, ShiftRestType, ShiftType } from '../../../types/shift';

export default function ShiftFieldCellType({
  shift,
  handleUpdateShift,
}: {
  shift: ShiftT;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const handleValueChange = (value: string) => {
    const newType = Number(value) as ShiftType;
    if (newType === shift.shiftType) return;
    const updates: Partial<ShiftT> = { shiftType: newType };
    if (newType !== ShiftType.DUTY) {
      updates.recuperationTime = 0;
    }
    handleUpdateShift({ ...shift, ...updates });
  };

  const isEditable =
    shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF;

  const getTypeLabel = (type: ShiftType): string => {
    switch (type) {
      case ShiftType.NORMAL:
        return 'Normal';
      case ShiftType.DUTY:
        return 'Duty';
      case ShiftType.ON_CALL:
        return 'On-call';
      default:
        return 'N/A';
    }
  };

  return (
    <td className={`py-0 text-center ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}>
      {isEditable ? (
        <Select value={shift.shiftType.toString()} onValueChange={handleValueChange}>
          <SelectTrigger
            className="mx-auto h-8 w-[110px]"
            data-testid={`shift-type-select-${shift.id}`}
          >
            <SelectValue>{getTypeLabel(shift.shiftType)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ShiftType.NORMAL.toString()}>Normal</SelectItem>
            <SelectItem value={ShiftType.DUTY.toString()}>Duty</SelectItem>
            <SelectItem value={ShiftType.ON_CALL.toString()}>On-call</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        getTypeLabel(shift.shiftType)
      )}
    </td>
  );
}
