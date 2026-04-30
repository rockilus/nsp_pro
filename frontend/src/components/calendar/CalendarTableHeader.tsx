import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkle } from 'lucide-react';
import { ColumnDefinition, ColumnFilter, TableSort } from '../../types/filter';
import ColumnSortFilterMenu from '../table/ColumnSortFilterMenu';
import { useTranslation } from '../../app/i18n/client';

dayjs.extend(isoWeek);

// Locale-aware weekday abbreviations (3 chars, Mon-first order)
const WEEKDAY_SHORT: Record<string, readonly string[]> = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
};

export function getWeekdayShort(d: Dayjs, lng?: string): string {
  const abbrevs = WEEKDAY_SHORT[lng ?? 'en'] ?? WEEKDAY_SHORT['en'];
  return abbrevs[d.isoWeekday() - 1]; // isoWeekday: 1=Mon … 7=Sun
}

export function buildWeekGroups(days: Dayjs[]): Array<{ weekNum: number; count: number }> {
  const groups: Array<{ weekNum: number; count: number }> = [];
  for (const d of days) {
    const w = d.isoWeek();
    if (groups.length === 0 || groups[groups.length - 1].weekNum !== w) {
      groups.push({ weekNum: w, count: 1 });
    } else {
      groups[groups.length - 1].count += 1;
    }
  }
  return groups;
}

export interface CalendarTableHeaderProps {
  /** Language code for i18n */
  lng?: string;
  /** Ordered list of days to display as columns */
  days: Dayjs[];
  /** Label shown in the sticky left column header (e.g. "Members", "Shift") */
  rowHeaderLabel: string;
  // Sort/Filter props for the left column
  rowColumn?: ColumnDefinition;
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  /** Optional content rendered inside the left sticky column (e.g. a select-all checkbox) */
  leadingColumnContent?: React.ReactNode;
  /** Optional column appended after the last day column (e.g. "Total") */
  trailingColumnHeader?: React.ReactNode;
  /** When true, each date column shows a column-select checkbox */
  isBulkMode?: boolean;
  isColumnSelected?: (date: Dayjs) => boolean;
  onColumnSelect?: (date: Dayjs) => void;
  /** When true, each date column shows a custom-solve sparkle button */
  isCustomSolveMode?: boolean;
  isCustomColumnSelected?: (date: Dayjs) => boolean;
  isCustomColumnIndeterminate?: (date: Dayjs) => boolean;
  onCustomColumnSelect?: (date: Dayjs) => void;
}

export default function CalendarTableHeader({
  lng,
  days,
  rowHeaderLabel,
  rowColumn,
  currentSort,
  currentFilter,
  onSort,
  onFilter,
  leadingColumnContent,
  trailingColumnHeader,
  isBulkMode = false,
  isColumnSelected,
  onColumnSelect,
  isCustomSolveMode = false,
  isCustomColumnSelected,
  isCustomColumnIndeterminate,
  onCustomColumnSelect,
}: CalendarTableHeaderProps) {
  const { t } = useTranslation(lng || 'en', 'common');
  const today = dayjs();
  const weekGroups = buildWeekGroups(days);

  const gridTemplate = `180px repeat(${days.length}, minmax(60px, 1fr))${
    trailingColumnHeader !== undefined ? ' 60px' : ''
  }`;

  return (
    <div className="sticky top-0 z-[3] bg-card" data-testid="calendar-table-header">
      {/* Week group row */}
      <div
        className="border-b border-border/50"
        style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
      >
        {/* Sticky corner */}
        <div className="sticky left-0 z-[4] border-r border-border/50 bg-card" />
        {/* Week spans — each spans N grid columns */}
        {weekGroups.map(({ weekNum, count }, idx) => (
          <div
            key={`week-${weekNum}-${idx}`}
            className={cn(
              'flex items-center justify-center truncate overflow-hidden border-r border-border/50 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground',
              idx > 0 && 'border-l-2 border-l-border',
            )}
            style={{ gridColumn: `span ${count}` }}
          >
            <span className="truncate">
              {count >= 2 ? `${t('week')} ${weekNum}` : `W${weekNum}`}
            </span>
          </div>
        ))}
        {/* Trailing corner (e.g. Total column) */}
        {trailingColumnHeader !== undefined && (
          <div className="border-l border-border/50 bg-card" />
        )}
      </div>

      {/* Day header row */}
      <div
        className="border-b-2 border-border"
        style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
      >
        {/* Left sticky column header */}
        <div className="sticky left-0 z-[4] flex items-center justify-between border-r border-border/50 bg-card px-2 py-1">
          <div className="flex items-center gap-1.5">
            {leadingColumnContent}
            <span className="text-sm text-foreground">{rowHeaderLabel}</span>
          </div>
          {rowColumn && onSort && onFilter && (
            <ColumnSortFilterMenu
              column={rowColumn}
              currentSort={currentSort}
              currentFilter={currentFilter}
              onSort={onSort}
              onFilter={onFilter}
            />
          )}
        </div>

        {/* Day cells — direct grid children, no wrapper div */}
        {days.map((d) => {
          const isWeekend = d.day() === 0 || d.day() === 6;
          const isToday = d.isSame(today, 'day');
          const isWeekBoundary = d.isoWeekday() === 1;
          const dateKey = d.format('YYYY-MM-DD');
          const colSelected = isColumnSelected ? isColumnSelected(d) : false;

          return (
            <div
              key={dateKey}
              className={cn(
                'flex h-14 flex-col items-center justify-center border-r border-border/50 px-1',
                isWeekend ? 'bg-muted' : 'bg-card',
                isWeekBoundary && 'border-l-2 border-l-border',
              )}
              data-testid={`date-header-${dateKey}`}
            >
              {/* Bulk mode column checkbox */}
              {isBulkMode && onColumnSelect && (
                <Checkbox
                  data-testid={`column-select-checkbox-${dateKey}`}
                  checked={colSelected}
                  onCheckedChange={() => onColumnSelect(d)}
                  className="mb-0.5 h-3.5 w-3.5"
                />
              )}
              {/* Custom-solve column sparkle */}
              {isCustomSolveMode && onCustomColumnSelect && (
                <button
                  data-testid={`date-column-sparkle-${dateKey}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCustomColumnSelect(d);
                  }}
                  className="mb-0.5 cursor-pointer border-none bg-transparent p-0"
                  style={{
                    color: isCustomColumnSelected?.(d)
                      ? '#1976d2'
                      : isCustomColumnIndeterminate?.(d)
                        ? '#42a5f5'
                        : '#9e9e9e',
                  }}
                >
                  <Sparkle
                    size={12}
                    fill={
                      isCustomColumnSelected?.(d) || isCustomColumnIndeterminate?.(d)
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                </button>
              )}
              {/* 3-char weekday abbreviation */}
              <div className="mb-0.5 text-[11px] leading-none text-muted-foreground">
                {getWeekdayShort(d, lng)}
              </div>
              {/* Day number — circle highlight for today */}
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none font-semibold',
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                )}
              >
                {d.date()}
              </div>
            </div>
          );
        })}

        {/* Trailing column header (e.g. "Total") */}
        {trailingColumnHeader !== undefined && (
          <div className="flex items-center justify-center border-l border-border/50 bg-card text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {trailingColumnHeader}
          </div>
        )}
      </div>
    </div>
  );
}
