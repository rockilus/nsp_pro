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

export default function ShiftFieldCellEndTime({
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
  const [valueState, setValueState] = useState(shift.endTime);

  // Calendar-day offset of the end time relative to the start day (0 = same day)
  const dayOffset = (start: dayjs.Dayjs, end: dayjs.Dayjs): number =>
    end.startOf('day').diff(start.startOf('day'), 'day');

  const buildTimeSlots = (): dayjs.Dayjs[] => {
    const timeSlots: dayjs.Dayjs[] = [];
    let firstSlot = shift.startTime;
    const lastSlot = dayjs.utc(firstSlot).add(24, 'hour');
    while (firstSlot.isBefore(lastSlot) || firstSlot.isSame(lastSlot)) {
      timeSlots.push(firstSlot);
      firstSlot = firstSlot.add(15, 'minute');
    }
    return timeSlots;
  };

  const timeSlots = buildTimeSlots();

  const handleValueChange = (value: string) => {
    setValueState(dayjs.utc(Number(value)));
  };

  const handleEditConfirm = () => {
    if (valueState !== shift.endTime) {
      handleUpdateShift({ ...shift, endTime: valueState });
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.endTime);
  };

  const isEditable =
    shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF;

  return (
    <td
      className={`py-0 text-center ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => isEditable && setEditing({ [shift.id]: 'end_time' })}
      data-testid={`shift-end-time-cell-${shift.id}`}
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
            data-testid={`shift-end-time-select-${shift.id}`}
          >
            <SelectValue>
              {valueState.format('HH:mm')}
              {dayOffset(shift.startTime, valueState) > 0
                ? ` (+${dayOffset(shift.startTime, valueState)})`
                : ''}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {timeSlots.map((time) => (
              <SelectItem key={time.valueOf()} value={String(time.valueOf())}>
                {time.format('HH:mm')} ({time.diff(shift.startTime, 'minute') / 60}
                h)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <>
          {shift.endTime.format('HH:mm')}
          {dayOffset(shift.startTime, shift.endTime) > 0 && (
            <sup>+{dayOffset(shift.startTime, shift.endTime)}</sup>
          )}
        </>
      )}
    </td>
  );
}
