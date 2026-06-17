'use client';

import * as React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
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
dayjs.extend(utc);

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

/** Build a UTC-midnight dayjs from year/month/day components to avoid timezone shifts. */
function utcDateFromParts(year: number, month: number, day: number): Dayjs {
  const pad = (n: number) => String(n).padStart(2, '0');
  return dayjs.utc(`${year}-${pad(month + 1)}-${pad(day)}T00:00:00Z`);
}

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

  const parseAndCommit = React.useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onChange(null);
      setInputValue('');
      return;
    }

    // Strict parsing: only accept DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, or the old display format
    const parsedLocal = dayjs(
      trimmed,
      ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', 'D MMMM YYYY'],
      true,
    );
    if (!parsedLocal.isValid()) {
      setInputValue(value ? value.format(DISPLAY_FORMAT) : '');
      return;
    }

    // Build UTC midnight from the parsed date components to avoid timezone shifts
    const parsed = utcDateFromParts(parsedLocal.year(), parsedLocal.month(), parsedLocal.date());

    // Enforce date bounds (both sides are UTC dayjs now)
    if (minDate && parsed.isBefore(minDate, 'day')) {
      setInputValue(value ? value.format(DISPLAY_FORMAT) : '');
      return;
    }
    if (maxDate && parsed.isAfter(maxDate, 'day')) {
      setInputValue(value ? value.format(DISPLAY_FORMAT) : '');
      return;
    }

    onChange(parsed);
  }, [inputValue, value, onChange, minDate, maxDate]);

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
                  // Build UTC midnight from the date components to avoid timezone shifts
                  onChange(
                    date
                      ? utcDateFromParts(date.getFullYear(), date.getMonth(), date.getDate())
                      : null,
                  );
                  setOpen(false);
                }}
                disabled={(date) => {
                  // Compare dates by their local date parts to avoid timezone skew
                  // from the Calendar's local-time Date objects vs UTC minDate/maxDate
                  const dateDayStart = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                  );
                  if (minDate) {
                    const minDayStart = new Date(minDate.year(), minDate.month(), minDate.date());
                    if (dateDayStart < minDayStart) return true;
                  }
                  if (maxDate) {
                    const maxDayStart = new Date(maxDate.year(), maxDate.month(), maxDate.date());
                    if (dateDayStart > maxDayStart) return true;
                  }
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
