import React, { Dispatch, SetStateAction, useState, useRef, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../app/i18n/client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
// Types
import { WorkerT } from '../../../types/worker';

dayjs.extend(utc);

export default function WorkerFieldEmploymentEnd({
  lng,
  worker,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  lng: string;
  worker: WorkerT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
}) {
  const { t } = useTranslation(lng, 'worker-page');

  const cellRef = useRef<HTMLDivElement>(null);
  const [valueState, setValueState] = useState<dayjs.Dayjs | null>(worker.employmentEndDate);

  const handlePermanentChange = () => {
    if (valueState) {
      setValueState(null);
    } else {
      setValueState(dayjs.utc());
    }
  };

  const handleDateChange = (newValue: string) => {
    if (!newValue) return;
    setValueState(dayjs.utc(newValue));
  };

  const handleEditConfirm = useCallback(
    (newDate: dayjs.Dayjs | null) => {
      if (!newDate) {
        handleUpdateWorker({ ...worker, employmentEndDate: null });
      } else if (!newDate.isSame(worker.employmentEndDate)) {
        handleUpdateWorker({ ...worker, employmentEndDate: newDate });
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
        setValueState(worker.employmentEndDate);
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
    <td className="py-0 text-center" data-testid="worker-employment-end-cell">
      {editing ? (
        <div
          ref={cellRef}
          className="flex flex-col items-center"
          data-testid={`worker-employment-end-editor-${worker.id}`}
        >
          <Input
            type="date"
            disabled={!valueState}
            value={valueState ? valueState.format('YYYY-MM-DD') : ''}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-auto"
            data-testid={`worker-employment-end-datepicker-input-${worker.id}`}
          />
          <label
            className="mt-1 flex cursor-pointer items-center gap-2 text-sm"
            data-testid={`worker-employment-end-permanent-checkbox-${worker.id}`}
          >
            <Checkbox
              checked={!valueState}
              onCheckedChange={handlePermanentChange}
              data-testid={`worker-employment-end-permanent-checkbox-input-${worker.id}`}
            />
            {t('permanent')}
          </label>
        </div>
      ) : (
        <div
          onClick={() => setEditing({ [worker.id]: 'employmentEndDate' })}
          className="flex min-h-[45px] cursor-pointer items-center justify-center"
          data-testid={`worker-employment-end-display-${worker.id}`}
        >
          <span>
            {worker.employmentEndDate
              ? worker.employmentEndDate.format('DD/MM/YYYY')
              : t('permanent')}
          </span>
        </div>
      )}
    </td>
  );
}
