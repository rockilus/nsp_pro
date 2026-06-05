import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColumnFilter } from '../../../types/filter';

interface TextFilterProps {
  onApply: (filter: ColumnFilter) => void;
  onClose: () => void;
  columnId: string;
  label: string;
  currentValue?: string;
}

export default function TextFilter({
  onApply,
  onClose,
  columnId,
  label,
  currentValue,
}: TextFilterProps) {
  const [value, setValue] = useState(currentValue || '');

  const handleApply = () => {
    if (value.trim()) {
      onApply({
        id: columnId,
        type: 'text',
        value: value.trim(),
        label: `${label} contains "${value.trim()}"`,
      });
    }
    onClose();
  };

  return (
    <div className="flex min-w-[250px] flex-col gap-3 p-4">
      <Input
        placeholder={`Filter ${label}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        autoFocus
      />
      <div className="flex gap-2">
        <Button onClick={handleApply} size="sm">
          Apply
        </Button>
        <Button onClick={onClose} variant="outline" size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}
