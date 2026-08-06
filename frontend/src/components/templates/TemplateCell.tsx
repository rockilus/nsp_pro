import React, { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { ScheduleTemplateEntryDTO } from '../../types/schedule-template';
import { Briefcase, UserPlus } from 'lucide-react';
import { DemandCellContent } from '../shiftDemand/DemandCellContent';

interface TemplateCellProps {
  entry: ScheduleTemplateEntryDTO | null;
  isWeekend: boolean;
  isSelected?: boolean;
  selectionEnabled?: boolean;
  shiftColor: { background: string; sample: string; text: string };
  onSelectToggle?: () => void;
  onAddDemand?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onAssignWorker?: () => void;
}

export function TemplateCell({
  entry,
  isWeekend,
  isSelected = false,
  selectionEnabled = false,
  shiftColor,
  onSelectToggle,
  onAddDemand,
  onIncrement,
  onDecrement,
  onAssignWorker,
}: TemplateCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const hasEntry = entry !== null;
  const demandCount = entry?.demandCount ?? 0;
  const workerCount = entry?.workerIds.length ?? 0;

  return (
    <div
      className={cn(
        'relative flex min-h-[2.5rem] items-center justify-center border-r border-b border-border/50 p-1',
        isWeekend && 'bg-muted',
        !selectionEnabled && 'cursor-pointer hover:bg-accent/50',
        isSelected && 'bg-primary/10 outline outline-2 outline-primary',
      )}
      style={
        {
          '--shift-bg-color': shiftColor.background,
          '--shift-sample-color': shiftColor.sample,
          '--shift-text-color': shiftColor.text,
        } as React.CSSProperties
      }
      onClick={(e) => {
        if (selectionEnabled) {
          onSelectToggle?.();
          e.stopPropagation();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`template-cell-${entry?.shiftId ?? 'empty'}-${entry?.dayOfWeek ?? ''}`}
    >
      {selectionEnabled && (
        <div className="absolute top-1 left-1 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelectToggle?.()}
            className="h-3 w-3"
            onClick={(e) => e.stopPropagation()}
            data-testid={`template-cell-checkbox`}
          />
        </div>
      )}

      {hasEntry && (
        <DemandCellContent
          value={demandCount}
          isSaving={false}
          isHovered={isHovered}
          onAddDemand={onAddDemand ?? (() => {})}
          onIncrement={onIncrement ?? (() => {})}
          onDecrement={onDecrement ?? (() => {})}
        />
      )}

      {workerCount > 0 && (
        <span className="absolute top-0.5 right-0.5 z-10 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-primary-foreground">
          {workerCount}
        </span>
      )}

      {!selectionEnabled && isHovered && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex h-5 items-stretch">
          {demandCount === 0 && (
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-0.5 bg-primary/15 text-[10px] font-medium text-primary hover:bg-primary/25"
              onClick={(e) => {
                e.stopPropagation();
                onAddDemand?.();
              }}
              aria-label="Add demand"
              data-testid="template-cell-add-demand"
            >
              <Briefcase className="size-3" />
            </button>
          )}
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-0.5 bg-primary/15 text-[10px] font-medium text-primary hover:bg-primary/25"
            onClick={(e) => {
              e.stopPropagation();
              onAssignWorker?.();
            }}
            aria-label="Add assignment"
            data-testid="template-cell-add-assignment"
          >
            <UserPlus className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
