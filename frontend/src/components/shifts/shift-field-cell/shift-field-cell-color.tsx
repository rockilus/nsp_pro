import React, { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from '../../../types/shift';
// Constants
import { ShiftColorMappings } from '../../../constants/constants';

export default function ShiftFieldCellColor({
  shift,
  handleUpdateShift,
}: {
  shift: ShiftT;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const [open, setOpen] = useState(false);

  const isEditable =
    shift.leaveType === ShiftLeaveType.NONE && shift.restType !== ShiftRestType.OFF;

  const handleColorChange = (colorKey: string) => {
    if (colorKey !== shift.color) {
      handleUpdateShift({ ...shift, color: colorKey });
    }
    setOpen(false);
  };

  return (
    <td className="w-[30px] py-0" data-testid={`shift-color-cell-${shift.id}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex min-w-0 ${isEditable ? 'cursor-pointer' : 'cursor-default'} border-none bg-transparent p-0`}
            disabled={!isEditable}
            data-testid={`shift-color-trigger-${shift.id}`}
          >
            <span
              className="block h-[22px] w-[30px] rounded-sm"
              style={{
                backgroundColor: ShiftColorMappings[shift.color]?.sample || '#ccc',
              }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-auto p-2">
          <div className="flex flex-wrap gap-1" data-testid="shift-color-picker">
            {Object.keys(ShiftColorMappings).map((colorKey) => (
              <button
                key={colorKey}
                type="button"
                onClick={() => handleColorChange(colorKey)}
                className="m-0.5 h-[30px] w-[30px] min-w-0 cursor-pointer rounded-full border-none p-0 hover:scale-110"
                style={{
                  backgroundColor: ShiftColorMappings[colorKey].sample,
                }}
                data-testid={`shift-color-option-${colorKey}`}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </td>
  );
}
