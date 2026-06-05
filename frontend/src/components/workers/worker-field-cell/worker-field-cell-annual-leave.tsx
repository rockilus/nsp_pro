import { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
// Types
import { WorkerT } from '../../../types/worker';

export default function WorkerFieldCellAnnualLeave({
  worker,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  worker: WorkerT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void | Promise<unknown>;
}) {
  const [valueState, setValueState] = useState<number | ''>(worker.annualLeave);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditConfirm = async () => {
    if (valueState !== worker.annualLeave && valueState !== '') {
      setIsUpdating(true);
      const result = handleUpdateWorker({ ...worker, annualLeave: valueState });
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        try {
          await (result as Promise<unknown>);
        } finally {
          setIsUpdating(false);
        }
      } else {
        setIsUpdating(false);
      }
    } else if (valueState === '') {
      setValueState(worker.annualLeave);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.annualLeave);
  };

  return (
    <td
      className={`py-0 text-center ${editing || isUpdating ? 'cursor-default' : 'cursor-pointer'}`}
      onClick={() => {
        if (!editing && !isUpdating) {
          setValueState(worker.annualLeave);
          setEditing({ [worker.id]: 'annualLeave' });
        }
      }}
      data-testid="worker-annual-leave-cell"
      data-updating={isUpdating}
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
          disabled={isUpdating}
          className="text-center"
          data-testid={`worker-annual-leave-input-${worker.id}`}
          data-updating={isUpdating}
        />
      ) : (
        <div
          className="flex min-h-[45px] items-center justify-center"
          data-testid={`worker-annual-leave-display-${worker.id}`}
          data-updating={isUpdating}
          data-value={worker.annualLeave}
        >
          {isUpdating ? 'Updating...' : worker.annualLeave}
        </div>
      )}
    </td>
  );
}
