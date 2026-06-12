import * as React from 'react';
// shadcn
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
// Styles
import './popover-select-shifts.css';

export default function PopoverSelectShifts({
  buttonContent,
  content,
  open,
  disabled,
  handleOpenPopover,
  handleClosePopover,
}: {
  buttonContent: React.ReactNode;
  content: React.ReactNode;
  open: boolean;
  disabled: boolean;
  handleOpenPopover: () => void;
  handleClosePopover: () => void;
}) {
  const handleOpenChange = (isOpen: boolean) => {
    if (disabled) return;
    if (isOpen) {
      handleOpenPopover();
    } else {
      handleClosePopover();
    }
  };

  return (
    <div className={`popover-select-shifts ${disabled ? 'disabled' : ''}`}>
      <label className="popover-select-shifts-label">
        <span className="popover-select-shifts-text">Select Shifts</span>
      </label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <div className="popover-select-shifts-button" data-testid="shift-options-button">
            {buttonContent}
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={-35}
          className="w-auto min-w-[200px] p-0"
          data-testid="shift-options-popover"
        >
          {content}
        </PopoverContent>
      </Popover>
    </div>
  );
}
