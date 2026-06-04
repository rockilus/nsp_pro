import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ColumnFilter } from '../../../types/filter';

interface SelectFilterProps {
  onApply: (filter: ColumnFilter) => void;
  onClose: () => void;
  columnId: string;
  label: string;
  options: Array<{ value: any; label: string }>;
  currentValue?: any[];
}

export default function SelectFilter({
  onApply,
  onClose,
  columnId,
  label,
  options,
  currentValue,
}: SelectFilterProps) {
  const [selectedValues, setSelectedValues] = useState<any[]>(currentValue || []);

  const handleToggle = (value: any) => {
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleApply = () => {
    if (selectedValues.length > 0) {
      const selectedLabels = selectedValues.map(
        (val) => options.find((opt) => opt.value === val)?.label || val,
      );
      onApply({
        id: columnId,
        type: 'select',
        value: selectedValues,
        label: `${label} is ${selectedLabels.join(', ')}`,
      });
    }
    onClose();
  };

  return (
    <div
      className="flex max-h-[300px] min-w-[250px] flex-col overflow-auto p-4"
      data-testid={`select-filter-${columnId}`}
    >
      <p className="mb-2 text-sm font-medium">Filter {label}</p>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
              data-testid={`filter-option-${columnId}-${option.value}`}
            />
            {option.label}
          </label>
        ))}
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
