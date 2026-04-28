import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { GapMode } from '@/types/team-generation-settings';

type Props = {
  id: string;
  mode: GapMode;
  days: number;
  onChange: (mode: GapMode, days?: number) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
};

export default function GapSetting({ id, mode, days, onChange, label, description }: Props) {
  const enabled = mode !== 'off';
  const selected = enabled ? mode : 'auto';

  return (
    <div className="flex items-start gap-4">
      <Checkbox
        id={id}
        checked={enabled}
        onCheckedChange={(c) => {
          const value = Boolean(c);
          if (!value) {
            onChange('off');
          } else {
            onChange('auto');
          }
        }}
        className="mt-1"
      />

      <div className="w-full">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}

        {enabled && (
          <div className="mt-3 pl-1">
            <label className="mr-3 text-sm text-muted-foreground"> </label>
            <div className="flex items-center gap-3">
              <select
                value={selected}
                onChange={(e) => onChange(e.target.value as GapMode, days)}
                className="rounded border p-1 text-sm"
              >
                <option value="auto">Auto</option>
                <option value="set">Set</option>
              </select>

              {selected === 'set' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={days}
                    onChange={(e) =>
                      onChange('set', Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
