import { Dispatch, SetStateAction, useState } from 'react';
import { Input } from '@/components/ui/input';
// Types
import { WorkerT } from '../../../types/worker';

export default function WorkerFieldCellAcronym({
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
  const [valueState, setValueState] = useState<string>(worker.acronym);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditConfirm = async () => {
    if (valueState !== worker.acronym) {
      setIsUpdating(true);
      const res = handleUpdateWorker({ ...worker, acronym: valueState });
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
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.acronym);
  };

  return (
    <td
      className="py-0 text-center"
      data-testid={`worker-acronym-cell-${worker.id}`}
      onClick={() => {
        if (!isUpdating) {
          setValueState(worker.acronym);
          setEditing({ [worker.id]: 'acronym' });
        }
      }}
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
          data-testid={`worker-acronym-input-${worker.id}`}
          data-updating={isUpdating}
        />
      ) : (
        <div
          className="flex min-h-[45px] items-center justify-center"
          data-testid={`worker-acronym-display-${worker.id}`}
        >
          {worker.acronym}
        </div>
      )}
    </td>
  );
}
