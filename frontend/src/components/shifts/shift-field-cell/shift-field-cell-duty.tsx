import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType, ShiftType } from '../../../types/shift';

export default function ShiftFieldCellDuty({
  shift,
  handleUpdateShift,
}: {
  shift: ShiftT;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const handleEditConfirm = () => {
    if (shift.shiftType === ShiftType.DUTY) {
      handleUpdateShift({ ...shift, shiftType: ShiftType.NORMAL });
    } else {
      handleUpdateShift({ ...shift, shiftType: ShiftType.DUTY });
    }
  };

  const isEditable =
    shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF;

  return (
    <td className={`py-0 text-center ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}>
      <Checkbox
        checked={shift.shiftType === ShiftType.DUTY}
        onClick={handleEditConfirm}
        disabled={!isEditable}
        data-testid={`shift-duty-checkbox-${shift.id}`}
      />
    </td>
  );
}
