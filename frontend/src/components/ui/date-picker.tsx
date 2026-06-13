'use client';

import * as React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

  const fromDate = minDate?.toDate();
  const toDate = maxDate?.toDate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-testid={props['data-testid']}
          className={cn(
            'h-9 w-full justify-start gap-2 text-left font-normal',
            !value && 'text-muted-foreground',
            error &&
              'border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40',
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          {value ? value.format('D MMMM YYYY') : (placeholder ?? 'Select date')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
  );
}

export { DatePicker };
