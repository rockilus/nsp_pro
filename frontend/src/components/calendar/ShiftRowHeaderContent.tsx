import React from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ShiftT, ShiftType } from '../../types/shift';
import { TeamT } from '../../types/team';
import { ShiftColorMappings } from '../../constants/constants';

interface ShiftRowHeaderContentProps {
  lng: string;
  team: TeamT;
  shift: ShiftT;
  showStats?: boolean;
  shiftCountActual?: number;
  shiftCountTarget?: number;
}

export function ShiftRowHeaderContent({
  lng,
  team,
  shift,
  showStats = false,
  shiftCountActual = 0,
  shiftCountTarget = 0,
}: ShiftRowHeaderContentProps) {
  const { t } = useTranslation(lng, 'schedule-page');
  const { sample } = ShiftColorMappings[shift.color] || { sample: '#9e9e9e' };

  return (
    <div className="flex w-full min-w-0 flex-row items-center">
      <div
        className={
          shift.shiftType === ShiftType.DUTY || shift.shiftType === ShiftType.ON_CALL
            ? 'mr-1 w-1 flex-shrink-0 self-stretch rounded-sm'
            : 'invisible mr-1 w-1 flex-shrink-0 self-stretch rounded-sm'
        }
        style={
          shift.shiftType === ShiftType.DUTY
            ? { backgroundColor: sample }
            : shift.shiftType === ShiftType.ON_CALL
              ? {
                  backgroundImage: `repeating-linear-gradient(to bottom, ${sample} 0px, ${sample} 8px, transparent 8px, transparent 12px)`,
                }
              : undefined
        }
      />
      <div className="flex w-full min-w-0 flex-col">
        <span
          className="text-[0.9rem] font-semibold break-words text-foreground"
          data-testid={`shift-name-${shift.id}`}
        >
          {shift.name} ({shift.acronym})
        </span>
        {showStats && team.useSolver && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={
                    shiftCountActual !== shiftCountTarget
                      ? 'text-[0.8rem] font-medium text-destructive'
                      : 'text-[0.8rem] font-medium text-green-600'
                  }
                  data-testid={`shift-count-${shift.id}`}
                >
                  {shiftCountActual} / {shiftCountTarget}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('shift_count_tooltip')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center px-1">
        <span
          className="text-[0.75rem] font-medium text-muted-foreground"
          data-testid={`shift-time-start-${shift.id}`}
        >
          {shift.startTime.format('HH:mm')}
        </span>
        <span
          className="text-[0.75rem] font-medium text-muted-foreground"
          data-testid={`shift-time-end-${shift.id}`}
        >
          {shift.endTime.format('HH:mm')}
          {!shift.endTime.isSame(shift.startTime, 'day') && <sup>+1</sup>}
        </span>
      </div>
    </div>
  );
}
