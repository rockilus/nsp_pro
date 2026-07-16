import React, { Dispatch, SetStateAction, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from '../../../types/shift';

dayjs.extend(utc);

export default function ShiftFieldCellStartTime({
  shift,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  shift: ShiftT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const timeSlots: dayjs.Dayjs[] = [];
  let firstSlot = dayjs.utc(shift.startTime).startOf('day');
  const lastSlot = dayjs.utc(firstSlot).endOf('day');
  while (firstSlot.isBefore(lastSlot) || firstSlot.isSame(lastSlot)) {
    timeSlots.push(firstSlot);
    firstSlot = firstSlot.add(15, 'minute');
  }

  const [valueState, setValueState] = useState(shift.startTime);

  const handleValueChange = (value: string) => {
    setValueState(dayjs.utc(Number(value)));
  };

  const handleEditConfirm = () => {
    if (valueState !== shift.startTime) {
      let adjustedEnd = shift.endTime;
      if (valueState.valueOf() >= shift.endTime.valueOf()) {
        adjustedEnd = valueState.add(1, 'hour');
      }
      handleUpdateShift({ ...shift, startTime: valueState, endTime: adjustedEnd });
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.startTime);
  };

  const isEditable =
    shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF;

  return (
    <td
      className={`py-0 text-center ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => isEditable && setEditing({ [shift.id]: 'start_time' })}
      data-testid={`shift-start-time-cell-${shift.id}`}
    >
      {editing ? (
        <Select
          value={String(valueState.valueOf())}
          onValueChange={handleValueChange}
          onOpenChange={(open) => {
            if (!open) handleEditConfirm();
          }}
        >
          <SelectTrigger
            className="mx-auto h-8 w-[100px]"
            data-testid={`shift-start-time-select-${shift.id}`}
          >
            <SelectValue>{valueState.format('HH:mm')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {timeSlots.map((time) => (
              <SelectItem key={time.valueOf()} value={String(time.valueOf())}>
                {time.format('HH:mm')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        shift.startTime.format('HH:mm')
      )}
    </td>
  );
}
