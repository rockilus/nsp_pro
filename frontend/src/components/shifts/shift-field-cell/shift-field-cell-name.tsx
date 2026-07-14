import React, { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
// Components
import { useLeaveNameDisplayed, useRestNameDisplayed } from '../shift-utils/shift-utils';
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from '../../../types/shift';

export default function ShiftFieldCellName({
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
  const [valueState, setValueState] = useState(shift.name);

  const getLeaveNameDisplayed = useLeaveNameDisplayed({
    lng,
  });
  const getRestNameDisplayed = useRestNameDisplayed({
    lng,
  });

  const handleEditConfirm = () => {
    if (valueState !== shift.name) {
      handleUpdateShift({ ...shift, name: valueState });
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.name);
  };

  const isEditable =
    shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF;

  const displayName =
    shift.restType === ShiftRestType.OFF
      ? getRestNameDisplayed(shift.restType)
      : shift.leaveType !== ShiftLeaveType.NONE
        ? getLeaveNameDisplayed(shift.leaveType)
        : shift.name || 'Unnamed Shift';

  return (
    <td
      className={`py-0 ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => isEditable && setEditing({ [shift.id]: 'name' })}
      data-testid={`shift-name-cell-${shift.id}`}
    >
      {editing ? (
        <Input
          type="text"
          value={valueState}
          onChange={(e) => setValueState(e.target.value)}
          onBlur={handleEditConfirm}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEditConfirm();
            } else if (e.key === 'Escape') {
              handleEditCancel();
            }
          }}
          autoFocus
          className="h-8"
          data-testid={`shift-name-input-${shift.id}`}
        />
      ) : (
        <div className="flex min-h-[45px] items-center px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1 overflow-hidden font-medium text-ellipsis">
                {displayName}
              </span>
            </TooltipTrigger>
            <TooltipContent>{displayName}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </td>
  );
}
