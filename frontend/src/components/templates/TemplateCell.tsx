import React, { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { ScheduleTemplateEntryDTO } from '../../types/schedule-template';
import { ShiftT } from '../../types/shift';
import { WorkerT } from '../../types/worker';
import { Briefcase, UserPlus } from 'lucide-react';
import { DemandCellContent } from '../shiftDemand/DemandCellContent';
import { AssignmentChip } from '../schedule/table/shared/assignment-chip';
import { ShiftColorMappings } from '../../constants/constants';

interface TemplateCellProps {
  entry: ScheduleTemplateEntryDTO | null;
  isWeekend: boolean;
  isSelected?: boolean;
  selectionEnabled?: boolean;
  shift: ShiftT;
  workers: WorkerT[];
  onSelectToggle?: () => void;
  onAddDemand?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onAssignWorker?: () => void;
  onRemoveWorker?: (workerId: string) => void;
}

export function TemplateCell({
  entry,
  isWeekend,
  isSelected = false,
  selectionEnabled = false,
  shift,
  workers,
  onSelectToggle,
  onAddDemand,
  onIncrement,
  onDecrement,
  onAssignWorker,
  onRemoveWorker,
}: TemplateCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const hasEntry = entry !== null;
  const demandCount = entry?.demandCount ?? 0;
  const workerIds = entry?.workerIds ?? [];

  const shiftColor = ShiftColorMappings[shift.color] ?? {
    background: '#f5f5f5',
    sample: '#9e9e9e',
    text: '#212121',
  };

  const assignedWorkers = workers.filter((w) => !w.deleted && workerIds.includes(w.id));

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

      <div className="flex w-full flex-col items-center gap-0.5">
        {hasEntry && demandCount > 0 && (
          <DemandCellContent
            value={demandCount}
            isSaving={false}
            isHovered={isHovered}
            onIncrement={onIncrement ?? (() => {})}
            onDecrement={onDecrement ?? (() => {})}
          />
        )}

        {assignedWorkers.map((worker) => (
          <AssignmentChip
            key={worker.id}
            name={worker.name}
            acronym={worker.acronym}
            showFullName={false}
            shiftType={shift.shiftType}
            shiftStartTime={shift.startTime.format('HH:mm')}
            shiftEndTime={shift.endTime.format('HH:mm')}
            isNextDay={!shift.endTime.isSame(shift.startTime, 'day')}
            showTimes={false}
            shiftColor={shiftColor}
            className="w-full"
            onClick={onAssignWorker}
            dataTestId={`template-chip-${worker.id}`}
          />
        ))}
      </div>

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
