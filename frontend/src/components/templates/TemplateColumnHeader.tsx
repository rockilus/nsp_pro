import React from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Checkbox } from '../ui/checkbox';
import { calendarGridTemplate } from '../../constants/constants';

const DAY_NAMES = [
  'monday_short',
  'tuesday_short',
  'wednesday_short',
  'thursday_short',
  'friday_short',
  'saturday_short',
  'sunday_short',
] as const;

export interface TemplateWeekColumn {
  weekNumber: number;
  label: string;
}

interface TemplateColumnHeaderProps {
  lng: string;
  weeks: TemplateWeekColumn[];
  rowHeaderLabel: string;
  selectionEnabled?: boolean;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
  onSelectAll?: () => void;
  isColumnSelected?: (colId: string) => boolean;
  isColumnIndeterminate?: (colId: string) => boolean;
  onColumnSelect?: (colId: string) => void;
}

export function TemplateColumnHeader({
  lng,
  weeks,
  rowHeaderLabel,
  selectionEnabled = false,
  isAllSelected = false,
  isSomeSelected = false,
  onSelectAll,
  isColumnSelected,
  isColumnIndeterminate,
  onColumnSelect,
}: TemplateColumnHeaderProps) {
  const { t } = useTranslation(lng, 'schedule-templates');
  const totalColumns = weeks.length * 7;

  return (
    <div className="sticky top-0 z-[3]">
      <div
        className="grid bg-card"
        style={{
          gridTemplateColumns: calendarGridTemplate(totalColumns),
        }}
      >
        <div className="flex items-center border-r border-b border-border/50 px-2 py-1">
          {selectionEnabled && onSelectAll && (
            <Checkbox
              data-testid="template-select-all-checkbox"
              checked={isSomeSelected ? 'indeterminate' : isAllSelected}
              onCheckedChange={onSelectAll}
              className="h-3.5 w-3.5 shrink-0"
            />
          )}
          <span className="ml-1 text-xs font-medium text-muted-foreground">{rowHeaderLabel}</span>
        </div>
        {weeks.map((week) => (
          <div
            key={week.weekNumber}
            className="border-r border-b border-border/50 px-1 py-1 text-center text-xs font-medium text-muted-foreground"
            style={{ gridColumn: 'span 7' }}
          >
            {week.label}
          </div>
        ))}
      </div>

      <div
        className="grid bg-card"
        style={{
          gridTemplateColumns: calendarGridTemplate(totalColumns),
        }}
      >
        <div className="border-r border-b border-border/50" />
        {weeks.flatMap((week) =>
          Array.from({ length: 7 }, (_, dayOfWeek) => {
            const colId = `${week.weekNumber}-${dayOfWeek}`;
            const colSelected = isColumnSelected?.(colId) ?? false;
            const colIndeterminate = isColumnIndeterminate?.(colId) ?? false;
            const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

            return (
              <div
                key={colId}
                className={`flex flex-col items-center justify-center border-r border-b border-border/50 px-1 py-1 ${isWeekend ? 'bg-muted' : ''}`}
              >
                <span className="text-xs text-muted-foreground">{t(DAY_NAMES[dayOfWeek])}</span>
                {selectionEnabled && onColumnSelect && (
                  <Checkbox
                    data-testid={`template-column-checkbox-${colId}`}
                    checked={colIndeterminate ? 'indeterminate' : colSelected}
                    onCheckedChange={() => onColumnSelect(colId)}
                    className="mt-0.5 h-3 w-3"
                  />
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
