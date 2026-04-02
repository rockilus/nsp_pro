'use client';

import React from 'react';
import type { Dayjs } from 'dayjs';
import { Input } from '@/components/ui/input';
import { formatToInput, parseFromInput } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

type DateInputProps = {
  value?: Dayjs | null;
  onChange: (d: Dayjs | null) => void;
  min?: Dayjs | string | null;
  max?: Dayjs | string | null;
  id?: string;
  name?: string;
  label?: string;
  timezone?: 'utc' | 'local';
  className?: string;
  required?: boolean;
  disabled?: boolean;
};

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    { value, onChange, min, max, id, name, label, timezone = 'utc', className, required, disabled },
    ref,
  ) => {
    const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFromInput(e.target.value, timezone === 'utc');
      onChange(parsed);
    };

    const norm = (d?: Dayjs | string | null) => {
      if (!d) return undefined;
      return typeof d === 'string' ? d : (d as Dayjs).utc().format('YYYY-MM-DD');
    };

    const combinedClassName = cn('px-3 py-1.5 font-sans', className);

    return (
      <Input
        ref={ref}
        id={id}
        name={name}
        aria-label={label}
        type="date"
        value={formatToInput(value)}
        onChange={handle}
        min={norm(min)}
        max={norm(max)}
        className={combinedClassName}
        required={required}
        disabled={disabled}
      />
    );
  },
);

DateInput.displayName = 'DateInput';

export default DateInput;
