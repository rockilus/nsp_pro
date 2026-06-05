import React, { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
// Types
import { WorkerT } from '../../../types/worker';

export default function WorkerFieldCellWeeklyHoursDesired({
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
  const [valueState, setValueState] = useState<number | ''>(worker.weeklyHoursDesired);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleEdit = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value === '' ? '' : Number(e.target.value);
    if (newValue !== '' && newValue < worker.weeklyHours) {
      setError(`Desired hours can't be lower than ${worker.weeklyHours}`);
    } else {
      setError(null);
    }
    setValueState(newValue);
  };

  const handleEditConfirm = async (usedOnBlur: boolean = false) => {
    if (typeof valueState === 'number' && valueState < worker.weeklyHours) {
      setError(`Desired hours can't be lower than ${worker.weeklyHours}`);
      if (usedOnBlur) {
        setValueState(worker.weeklyHoursDesired);
        setEditing({});
        setError(null);
      }
      return;
    }
    setError(null);
    if (valueState !== worker.weeklyHoursDesired && valueState !== '') {
      setIsSaving(true);
      try {
        await handleUpdateWorker({ ...worker, weeklyHoursDesired: valueState });
      } finally {
        setIsSaving(false);
      }
    } else if (valueState === '') {
      setValueState(worker.weeklyHoursDesired);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.weeklyHoursDesired);
    setError(null);
  };

  return (
    <td
      className="py-0 text-center"
      onClick={() => setEditing({ [worker.id]: 'weeklyHoursDesired' })}
      data-testid="worker-weekly-hours-desired-cell"
      data-state={editing ? 'editing' : isSaving ? 'saving' : 'display'}
      data-current-value={worker.weeklyHoursDesired}
    >
      {editing ? (
        <Input
          type="number"
          value={valueState}
          onChange={handleEdit}
          onBlur={() => handleEditConfirm(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEditConfirm();
            } else if (e.key === 'Escape') {
              handleEditCancel();
            }
          }}
          autoFocus
          aria-invalid={!!error}
          className={`text-center ${error ? 'border-destructive' : ''}`}
          data-testid={`worker-weekly-hours-desired-input-${worker.id}`}
          data-state="editing"
        />
      ) : (
        <div
          className="flex min-h-[45px] items-center justify-center"
          data-testid={`worker-weekly-hours-desired-display-${worker.id}`}
          data-state="display"
          data-value={worker.weeklyHoursDesired}
        >
          {worker.weeklyHoursDesired}
        </div>
      )}
    </td>
  );
}
