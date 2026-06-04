import React, { Dispatch, SetStateAction, useState, useRef, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Input } from '@/components/ui/input';
// Types
import { WorkerT } from '../../../types/worker';

dayjs.extend(utc);

export default function WorkerFieldEmploymentStart({
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
  const cellRef = useRef<HTMLDivElement>(null);
  const [valueState, setValueState] = useState<dayjs.Dayjs>(worker.employmentStartDate);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!newValue) return;
    const newDate = dayjs.utc(newValue);
    setValueState(newDate);
    handleEditConfirm(newDate);
  };

  const handleEditConfirm = useCallback(
    (newDate: dayjs.Dayjs) => {
      if (!newDate.isSame(worker.employmentStartDate)) {
        handleUpdateWorker({
          ...worker,
          employmentStartDate: newDate,
        });
      }
      setEditing({});
    },
    [worker, handleUpdateWorker, setEditing],
  );

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (!editing) return;
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        handleEditConfirm(valueState);
      }
    },
    [cellRef, valueState, editing, handleEditConfirm],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!editing) return;
      if (event.key === 'Enter') {
        handleEditConfirm(valueState);
      } else if (event.key === 'Escape') {
        setValueState(worker.employmentStartDate);
        setEditing({});
      }
    },
    [worker, valueState, editing, handleEditConfirm, setEditing],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown, editing]);

  return (
    <td className="py-0 text-center" data-testid="worker-employment-start-cell">
      {editing ? (
        <div ref={cellRef} className="flex justify-center">
          <Input
            type="date"
            value={valueState.format('YYYY-MM-DD')}
            onChange={handleDateChange}
            className="w-auto"
            data-testid={`worker-employment-start-input-${worker.id}`}
            id={`worker-employment-start-input-${worker.id}`}
          />
        </div>
      ) : (
        <div
          onClick={() => setEditing({ [worker.id]: 'employmentStartDate' })}
          className="flex min-h-[45px] cursor-pointer items-center justify-center"
          data-testid={`worker-employment-start-display-${worker.id}`}
        >
          <span>{worker.employmentStartDate.format('DD/MM/YYYY')}</span>
        </div>
      )}
    </td>
  );
}
