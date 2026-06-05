import React, { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
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
    <td
      className="py-0"
      data-testid="worker-name-cell"
      onClick={() => setEditing({ [worker.id]: 'name' })}
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
          data-testid={`worker-name-input-${worker.id}`}
          data-state="editing"
        />
      ) : (
        <div
          className="flex min-h-[45px] items-center"
          data-testid={`worker-name-display-${worker.id}`}
          data-state="display"
          data-worker-name={worker.name || 'Unnamed Worker'}
        >
          {worker.name || 'Unnamed Worker'}
        </div>
      )}
    </td>
  );
}
