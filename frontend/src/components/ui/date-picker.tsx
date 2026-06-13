'use client';

import * as React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

dayjs.extend(customParseFormat);

interface DatePickerProps {
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  'data-testid'?: string;
  className?: string;
}

const DISPLAY_FORMAT = 'DD/MM/YYYY';

function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  placeholder,
  error,
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  // Keep the input text synced with the controlled value
  React.useEffect(() => {
    setInputValue(value ? value.format(DISPLAY_FORMAT) : '');
  }, [value]);

  const fromDate = minDate?.toDate();
  const toDate = maxDate?.toDate();

  const parseAndCommit = React.useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onChange(null);
      setInputValue('');
      return;
    }

    // Strict parsing: only accept DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, or the old display format
    const parsed = dayjs(trimmed, ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', 'D MMMM YYYY'], true);
    if (!parsed.isValid()) {
      setInputValue(value ? value.format(DISPLAY_FORMAT) : '');
      return;
    }

    // Enforce date bounds
    if (fromDate && parsed.isBefore(fromDate, 'day')) {
      setInputValue(value ? value.format(DISPLAY_FORMAT) : '');
      return;
    }
    if (toDate && parsed.isAfter(toDate, 'day')) {
      setInputValue(value ? value.format(DISPLAY_FORMAT) : '');
      return;
    }

    onChange(parsed);
  }, [inputValue, value, onChange, fromDate, toDate]);

  return (
    <div className={className}>
      <InputGroup>
        <InputGroupInput
          disabled={disabled}
          data-testid={props['data-testid']}
          placeholder={placeholder ?? 'JJ/MM/AAAA'}
          value={inputValue}
          aria-invalid={error || undefined}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={parseAndCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              parseAndCommit();
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                aria-label="Select date"
                disabled={disabled}
              >
                <CalendarIcon />
                <span className="sr-only">Select date</span>
              </InputGroupButton>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                defaultMonth={value?.toDate()}
                selected={value?.toDate()}
                onSelect={(date) => {
                  onChange(date ? dayjs(date) : null);
                  setOpen(false);
                }}
                disabled={(date) => {
                  if (fromDate && date < fromDate) return true;
                  if (toDate && date > toDate) return true;
                  return false;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export { DatePicker };
