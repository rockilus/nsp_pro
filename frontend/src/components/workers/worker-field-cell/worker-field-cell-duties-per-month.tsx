import React, { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
// Types
import { WorkerT } from '../../../types/worker';

export default function WorkerFieldCellDutiesPerMonth({
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
  const [valueState, setValueState] = useState<number | ''>(worker.dutiesPerMonth);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditConfirm = async () => {
    if (valueState !== worker.dutiesPerMonth && valueState !== '') {
      setIsSaving(true);
      try {
        await handleUpdateWorker({
          ...worker,
          dutiesPerMonth: valueState,
        });
      } finally {
        setIsSaving(false);
      }
    } else if (valueState === '') {
      setValueState(worker.dutiesPerMonth);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.dutiesPerMonth);
  };

  return (
    <td
      className="py-0 text-center"
      onClick={() => !editing && !isSaving && setEditing({ [worker.id]: 'dutiesPerMonth' })}
      data-testid="worker-duties-per-month-cell"
      data-saving={isSaving}
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
          disabled={isSaving}
          className="text-center"
          data-testid={`worker-duties-per-month-input-${worker.id}`}
          data-saving={isSaving}
        />
      ) : (
        <div
          className="flex min-h-[45px] items-center justify-center"
          data-testid={`worker-duties-per-month-display-${worker.id}`}
          data-saving={isSaving}
          data-value={worker.dutiesPerMonth}
        >
          {isSaving ? 'Saving...' : worker.dutiesPerMonth}
        </div>
      )}
    </td>
  );
}
