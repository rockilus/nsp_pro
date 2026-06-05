import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColumnFilter } from '../../../types/filter';

interface DateFilterProps {
  onApply: (filter: ColumnFilter) => void;
  onClose: () => void;
  columnId: string;
  label: string;
  currentValue?: { start: string; end: string };
}

export default function DateFilter({
  onApply,
  onClose,
  columnId,
  label,
  currentValue,
}: DateFilterProps) {
  const [startDate, setStartDate] = useState(currentValue?.start || '');
  const [endDate, setEndDate] = useState(currentValue?.end || '');

  const handleApply = () => {
    if (startDate || endDate) {
      onApply({
        id: columnId,
        type: 'date',
        value: { start: startDate, end: endDate },
        label: `${label} between ${startDate} and ${endDate}`,
      });
    }
    onClose();
  };

  return (
    <div className="flex min-w-[300px] flex-col p-4" data-testid={`date-filter-${columnId}`}>
      <p className="mb-2 text-sm font-medium">Filter {label}</p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            data-testid={`filter-start-date-${columnId}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            data-testid={`filter-end-date-${columnId}`}
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={handleApply} size="sm" data-testid={`filter-apply-${columnId}`}>
          Apply
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
          data-testid={`filter-cancel-${columnId}`}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
