import React, { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
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
    <td
      className="py-0 text-center"
      onClick={() => !editing && !isSaving && setEditing({ [worker.id]: 'weeklyHours' })}
      data-testid="worker-weekly-hours-cell"
      data-state={editing ? 'editing' : isSaving ? 'saving' : 'display'}
      data-worker-id={worker.id}
    >
      {editing ? (
        <Input
          type="number"
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
          className="text-center"
          data-testid={`worker-weekly-hours-input-${worker.id}`}
          data-state="editing"
        />
      ) : (
        <div
          className="flex min-h-[45px] items-center justify-center"
          data-testid={`worker-weekly-hours-display-${worker.id}`}
          data-state={isSaving ? 'saving' : 'display'}
          data-value={worker.weeklyHours}
        >
          {isSaving ? 'Saving...' : worker.weeklyHours}
        </div>
      )}
    </td>
  );
}
