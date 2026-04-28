import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type Props = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
};

export default function CheckboxSetting({
  id,
  checked,
  onCheckedChange,
  label,
  description,
}: Props) {
  return (
    <div className="flex items-start gap-4">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-1" />
      <div>
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
