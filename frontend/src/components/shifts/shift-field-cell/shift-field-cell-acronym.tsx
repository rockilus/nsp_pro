import React, { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from '../../../types/shift';

export default function ShiftFieldCellAcronym({
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
  handleUpdateShift: (updatedShift: ShiftT) => void | Promise<unknown>;
}) {
  const [valueState, setValueState] = useState(shift.acronym);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditConfirm = () => {
    (async () => {
      if (valueState !== shift.acronym) {
        setIsUpdating(true);
        const res = handleUpdateShift({ ...shift, acronym: valueState });
        if (res && typeof (res as Promise<unknown>).then === 'function') {
          try {
            await (res as Promise<unknown>);
          } finally {
            setIsUpdating(false);
          }
        } else {
          setIsUpdating(false);
        }
      }

      setEditing({});
    })();
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.acronym);
  };

  const isEditable =
    shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF && !isUpdating;

  return (
    <td
      className={`py-0 text-center ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => {
        if (isEditable) {
          setValueState(shift.acronym);
          setEditing({ [shift.id]: 'acronym' });
        }
      }}
      data-testid={`shift-acronym-cell-${shift.id}`}
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
          disabled={isUpdating}
          className="text-center"
          data-testid={`shift-acronym-input-${shift.id}`}
        />
      ) : (
        <div
          className="flex min-h-[45px] items-center justify-center"
          data-testid={`shift-acronym-display-${shift.id}`}
        >
          {shift.acronym}
        </div>
      )}
    </td>
  );
}
