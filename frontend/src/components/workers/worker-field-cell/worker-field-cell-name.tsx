import React, { Dispatch, SetStateAction, useState } from 'react';
// MUI
import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
// Types
import { WorkerT } from '../../../types/worker';

export default function WorkerFieldCellName({
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
  const [valueState, setValueState] = useState<string>(worker.name);

  const handleEditConfirm = async () => {
    if (valueState !== worker.name) {
      handleUpdateWorker({
        ...worker,
        name: valueState,
      });
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.name);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      data-testid="worker-name-cell"
      onClick={() => setEditing({ [worker.id]: 'name' })}
      sx={{ paddingY: 0 }}
    >
      {editing ? (
        <TextField
          fullWidth
          type="text"
          name="Name"
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
          inputProps={{
            'data-testid': `worker-name-input-${worker.id}`,
            'data-state': 'editing',
          }}
        />
      ) : (
        <Box
          sx={{ minHeight: 45, display: 'flex', alignItems: 'center' }}
          data-testid={`worker-name-display-${worker.id}`}
          data-state="display"
          data-worker-name={worker.name || 'Unnamed Worker'}
        >
          {worker.name || 'Unnamed Worker'}
        </Box>
      )}
    </TableCell>
  );
}
