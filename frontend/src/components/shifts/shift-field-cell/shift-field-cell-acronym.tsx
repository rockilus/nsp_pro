import React, { Dispatch, SetStateAction, useState } from 'react';
// MUI
import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
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
  // allow async updates (parent may return a Promise)
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

  // We intentionally avoid setting local state from an effect to satisfy
  // react-hooks rules. Instead we initialize the edit value when entering
  // edit mode below.

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => {
        if (
          shift.leaveType === ShiftLeaveType.NONE &&
          shift.restType !== ShiftRestType.OFF &&
          !isUpdating
        ) {
          // initialize local edit value from prop when entering edit mode
          setValueState(shift.acronym);
          setEditing({ [shift.id]: 'acronym' });
        }
      }}
      sx={{
        paddingY: 0,
        cursor:
          shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF
            ? 'pointer'
            : 'default',
      }}
    >
      {editing ? (
        <TextField
          fullWidth
          type="text"
          name="Acronym"
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
        />
      ) : (
        <Box
          sx={{
            minHeight: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {shift.acronym}
        </Box>
      )}
    </TableCell>
  );
}
