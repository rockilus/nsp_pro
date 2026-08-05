import React from 'react';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { ScheduleTemplateEntryDTO } from '../../types/schedule-template';
import { Briefcase, UserPlus } from 'lucide-react';

interface TemplateCellProps {
  entry: ScheduleTemplateEntryDTO | null;
  isWeekend: boolean;
  isSelected?: boolean;
  selectionEnabled?: boolean;
  onClick?: () => void;
  onSelectToggle?: () => void;
  onAddDemand?: () => void;
  onAssignWorker?: () => void;
}

export function TemplateCell({
  entry,
  isWeekend,
  isSelected = false,
  selectionEnabled = false,
  onClick,
  onSelectToggle,
  onAddDemand,
  onAssignWorker,
}: TemplateCellProps) {
  const hasEntry = entry !== null;
  const demandCount = entry?.demandCount ?? 0;
  const workerCount = entry?.workerIds.length ?? 0;

  return (
    <div
      className={cn(
        'group relative flex min-h-[2.5rem] items-center justify-center border-r border-b border-border/50 p-1',
        isWeekend && 'bg-muted',
        !selectionEnabled && 'cursor-pointer hover:bg-accent/50',
        isSelected && 'bg-primary/10 outline outline-2 outline-primary',
      )}
      onClick={(e) => {
        if (selectionEnabled) {
          onSelectToggle?.();
          e.stopPropagation();
          return;
        }
        onClick?.();
      }}
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
        <Badge
          variant={demandCount > 0 ? 'default' : 'secondary'}
          className={cn(
            'text-[10px] font-medium',
            demandCount > 0 && 'bg-primary/10 text-primary hover:bg-primary/10',
          )}
          data-testid={`template-cell-badge-${entry.shiftId}-${entry.dayOfWeek}`}
        >
          {demandCount}
          {workerCount > 0 && ` (${workerCount})`}
        </Badge>
      )}

      {!selectionEnabled && (
        <div className="absolute inset-x-0 bottom-0 flex h-5 items-stretch opacity-0 transition-opacity group-hover:opacity-100">
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
