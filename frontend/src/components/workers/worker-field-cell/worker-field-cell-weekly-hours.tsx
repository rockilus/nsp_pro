import React, { Dispatch, SetStateAction, useState } from 'react';
// MUI
import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
// Types
import { WorkerT } from '../../../types/worker';

export default function WorkerFieldCellWeeklyHours({
  worker,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  worker: WorkerT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
}) {
  const [valueState, setValueState] = useState<number | ''>(worker.weeklyHours);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditConfirm = async () => {
    if (valueState !== worker.weeklyHours && valueState !== '') {
      setIsSaving(true);
      await handleUpdateWorker({
        ...worker,
        weeklyHours: valueState,
      });
      setIsSaving(false);
    } else if (valueState === '') {
      setValueState(worker.weeklyHours);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.weeklyHours);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => !editing && !isSaving && setEditing({ [worker.id]: 'weeklyHours' })}
      sx={{ paddingY: 0, textAlign: 'center' }}
      data-testid="worker-weekly-hours-cell"
      data-state={editing ? 'editing' : isSaving ? 'saving' : 'display'}
      data-worker-id={worker.id}
    >
      {editing ? (
        <TextField
          fullWidth
          type="number"
          name="Weekly Hours"
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
          inputProps={{
            style: { textAlign: 'center' },
            'data-testid': `worker-weekly-hours-input-${worker.id}`,
            'data-state': 'editing',
          }}
        />
      ) : (
        <Box
          sx={{
            minHeight: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-testid={`worker-weekly-hours-display-${worker.id}`}
          data-state={isSaving ? 'saving' : 'display'}
          data-value={worker.weeklyHours}
        >
          {isSaving ? 'Saving...' : worker.weeklyHours}
        </Box>
      )}
    </TableCell>
  );
}
