import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { cn } from '@/lib/utils';
import { StaffingSummaryLoadingIndicator } from './StaffingSummaryLoadingIndicator';
import { RequestT, RequestType, RequestStatus, FulfillmentStatus } from '../../types/request';
import { WorkerT } from '../../types/worker';
import { ShiftT } from '../../types/shift';
import {
  getRequestTargetDisplayText,
  getShiftColors,
} from '../../utils/shift-worker-option-display';
import { ColumnDefinition, ColumnFilter, TableSort } from '../../types/filter';
import ColumnSortFilterMenu from '../table/ColumnSortFilterMenu';
import { useTranslation } from '../../app/i18n/client';

dayjs.extend(isoWeek);

type StaffingSummary = {
  [date: string]: {
    demand: number;
    available: number;
    delta: number;
  };
};

interface RequestCalendarTableProps {
  workers: WorkerT[];
  days: Dayjs[];
  shifts: ShiftT[];
  getRequestForDay: (workerId: string, day: Dayjs) => RequestT | null;
  handleAddRequest?: (request: RequestT) => void;
  handleUpdateRequest?: (request: RequestT) => void;
  lng?: string;
  teamId?: string;
  onCellClick: (workerId: string, date: Dayjs) => void;
  onRequestClick: (request: RequestT) => void;
  staffingSummary: StaffingSummary | null;
  isCalculating: boolean;
  // Filter/Sort props
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  workerColumn?: ColumnDefinition;
}

interface RequestCalendarCellProps {
  worker: WorkerT;
  date: Dayjs;
  request: RequestT | null;
  shifts: ShiftT[];
  canAddRequest: boolean;
  canEditRequest: boolean;
  isPast: boolean;
  isEmpty: boolean;
  onCellClick: (workerId: string, date: Dayjs) => void;
  onRequestClick: (request: RequestT) => void;
}

interface RequestCalendarRowProps {
  worker: WorkerT;
  days: Dayjs[];
  shifts: ShiftT[];
  getRequestForDay: (workerId: string, day: Dayjs) => RequestT | null;
  handleAddRequest?: (request: RequestT) => void;
  handleUpdateRequest?: (request: RequestT) => void;
  lng?: string;
  teamId?: string;
  onCellClick: (workerId: string, date: Dayjs) => void;
  onRequestClick: (request: RequestT) => void;
}

interface RequestCalendarHeaderProps {
  lng?: string;
  days: Dayjs[];
  // Filter/Sort props
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  workerColumn?: ColumnDefinition;
}

interface RequestCalendarBodyProps {
  workers: WorkerT[];
  days: Dayjs[];
  shifts: ShiftT[];
  getRequestForDay: (workerId: string, day: Dayjs) => RequestT | null;
  handleAddRequest?: (request: RequestT) => void;
  handleUpdateRequest?: (request: RequestT) => void;
  lng?: string;
  teamId?: string;
  onCellClick: (workerId: string, date: Dayjs) => void;
  onRequestClick: (request: RequestT) => void;
}

interface StaffingSummaryRowsProps {
  days: Dayjs[];
  staffingSummary: StaffingSummary | null;
  isCalculating: boolean;
}

// Individual cell component
function RequestCalendarCell({
  worker,
  date,
  request,
  shifts,
  canAddRequest,
  canEditRequest,
  isPast,
  isEmpty,
  onCellClick,
  onRequestClick,
}: RequestCalendarCellProps) {
  const isPastEmpty = isPast && isEmpty;
  const isWeekend = date.day() === 0 || date.day() === 6;

  const handleClick = () => {
    if (canAddRequest) {
      onCellClick(worker.id, date);
    } else if (canEditRequest && request) {
      onRequestClick(request);
    }
  };

  const getTitle = () => {
    if (isPastEmpty) {
      return `Past date - ${date.format('MMM D')}`;
    }
    if (worker.deleted && isEmpty) {
      return `Worker deleted - ${date.format('MMM D')}`;
    }
    if (canAddRequest) {
      return `Click to create request for ${worker.name} on ${date.format('MMM D')}`;
    }
    if (canEditRequest && request) {
      // Build the tooltip content as plain text
      const targetText = getRequestTargetDisplayText(request, [], shifts, 'not');

      const periodText = request.startDate.isSame(request.endDate, 'day')
        ? request.startDate.format('DD MMM').toLowerCase()
        : `${request.startDate.format('DD MMM').toLowerCase()} - ${request.endDate
            .format('DD MMM')
            .toLowerCase()}`;

      const statusEmoji = (() => {
        switch (request.status) {
          case RequestStatus.PENDING:
            return '🟠';
          case RequestStatus.APPROVED:
            return '🟢';
          case RequestStatus.DENIED:
            return '🔴';
          default:
            return '';
        }
      })();

      const fulfillmentEmoji = (() => {
        switch (request.fulfillment) {
          case FulfillmentStatus.FULFILLED:
            return '✅';
          case FulfillmentStatus.UNFULFILLED:
            return '❌';
          default:
            return '';
        }
      })();

      let tooltip = `📆 ${periodText}\n${targetText}\n${statusEmoji} ${request.status}`;

      // Only show fulfillment status if the request has been approved
      if (request.status === RequestStatus.APPROVED) {
        tooltip += `\n${fulfillmentEmoji} ${request.fulfillment}`;
      }

      if (request.comment) {
        tooltip += `\nComment: ${request.comment}`;
      }

      return tooltip;
    }
    return undefined;
  };

  // Get shift colors for CSS variables (uses utility function)
  const shiftColors = getShiftColors(request, shifts);

  // Get emoji indicators for the request
  const getRequestEmojis = () => {
    if (!request) return null;

    const emojis: string[] = [];

    // Work request type indicator (negative vs positive)
    if (request.requestType === RequestType.WORK_DEMAND) {
      if (request.negative) {
        emojis.push('🙅'); // Person gesturing no
      } else {
        emojis.push('🙋'); // Person raising one hand
      }
    }

    // Fulfillment indicator (only show for approved requests)
    if (request.status === RequestStatus.APPROVED) {
      switch (request.fulfillment) {
        case FulfillmentStatus.FULFILLED:
          emojis.push('✅'); // Check mark
          break;
        case FulfillmentStatus.UNFULFILLED:
          emojis.push('❌'); // Cross mark
          break;
      }
    }

    return emojis.join(' ');
  };

  const requestEmojis = getRequestEmojis();

  // Get status-specific inline style (pending uses diagonal stripe, can't do in Tailwind)
  const getStatusStyle = (): React.CSSProperties => {
    if (!request) return {};
    if (request.status === RequestStatus.PENDING) {
      return {
        background: `repeating-linear-gradient(
          -45deg,
          var(--shift-bg-color, #f5f5f5),
          var(--shift-bg-color, #f5f5f5) 6px,
          rgba(255,255,255,0.6) 6px,
          rgba(255,255,255,0.6) 12px
        )`,
      };
    }
    return {};
  };

  const isWeekBoundary = date.isoWeekday() === 1;

  return (
    <div
      key={date.date()}
      className={cn(
        // Base cell
        'relative flex min-h-[40px] min-w-[60px] items-center justify-center border-r border-border/50 p-1 text-sm transition-all duration-200',
        // Week boundary: thick left border on Mondays (except the very first cell)
        isWeekBoundary && 'border-l-2 border-l-border',
        // Weekend background
        isWeekend && 'bg-muted',
        // Leave/request cell
        request &&
          'rounded border border-[var(--shift-sample-color,transparent)] font-medium opacity-[0.95] shadow-sm',
        request && 'hover:z-[2] hover:scale-[1.02] hover:opacity-100 hover:shadow-md',
        // Denied: dashed border, muted
        request && request.status === RequestStatus.DENIED && 'border-dashed opacity-60',
        // Past empty
        isPastEmpty && 'cursor-not-allowed !bg-muted/50 opacity-50',
        // Clickable empty
        !request &&
          (canAddRequest || canEditRequest) &&
          'group cursor-pointer hover:rounded hover:border-dashed hover:border-primary/50 hover:bg-primary/[0.08]',
        // Clickable request
        request && (canAddRequest || canEditRequest) && 'cursor-pointer',
      )}
      style={
        {
          ...(shiftColors && {
            '--shift-bg-color': shiftColors.background,
            '--shift-sample-color': shiftColors.sample,
            '--shift-text-color': shiftColors.text,
            background: shiftColors.background,
            color: shiftColors.text,
          }),
          ...getStatusStyle(),
        } as React.CSSProperties
      }
      data-testid={`calendar-cell-${worker.id}-${date.format('YYYY-MM-DD')}${
        request ? `-request-${request.id}` : ''
      }`}
      data-request-type={request ? request.requestType : undefined}
      data-request-status={request ? request.status : undefined}
      onClick={handleClick}
      title={getTitle()}
    >
      {/* '+' indicator for clickable empty cells */}
      {!request && (canAddRequest || canEditRequest) && (
        <span className="absolute text-base font-bold text-primary/70 opacity-0 transition-opacity group-hover:opacity-100">
          +
        </span>
      )}
      {request && requestEmojis && (
        <div className="z-[1] flex items-center justify-center gap-0.5 text-base leading-none">
          {requestEmojis}
        </div>
      )}
    </div>
  );
}

// Row component
function RequestCalendarRow({
  worker,
  days,
  shifts,
  getRequestForDay,
  handleAddRequest,
  handleUpdateRequest,
  lng,
  teamId,
  onCellClick,
  onRequestClick,
}: RequestCalendarRowProps) {
  return (
    <div className="flex min-h-[40px] items-stretch border-b border-border/50 transition-colors hover:bg-black/[0.04]">
      {/* Sticky worker name column */}
      <div
        className="sticky left-0 z-[2] flex w-[180px] max-w-[220px] min-w-[180px] shrink-0 items-center overflow-hidden border-r border-border/50 bg-card px-3 py-2 text-sm font-medium whitespace-nowrap text-foreground"
        title={worker.name}
      >
        <span className="truncate">{worker.name}</span>
      </div>
      {/* Day cells */}
      <div className="flex flex-1">
        {days.map((d) => {
          const request = getRequestForDay(worker.id, d);
          const isEmpty = !request;
          const isPast = d.isBefore(dayjs().utc(), 'day');
          const canAddRequest =
            isEmpty && !isPast && !worker.deleted && !!handleAddRequest && !!lng && !!teamId;
          const canEditRequest = !!request && !!handleUpdateRequest && !!lng && !!teamId;

          return (
            <RequestCalendarCell
              key={d.date()}
              worker={worker}
              date={d}
              request={request}
              shifts={shifts}
              canAddRequest={canAddRequest}
              canEditRequest={canEditRequest}
              isPast={isPast}
              isEmpty={isEmpty}
              onCellClick={onCellClick}
              onRequestClick={onRequestClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// Helper: group `days` by ISO week number, returning spans for the week header row
function buildWeekGroups(days: Dayjs[]): Array<{ weekNum: number; count: number }> {
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

// Header component
function RequestCalendarHeader({
  lng,
  days,
  currentSort,
  currentFilter,
  onSort,
  onFilter,
  workerColumn,
}: RequestCalendarHeaderProps) {
  const { t } = useTranslation(lng || 'en', 'request-page');
  const today = dayjs();
  const weekGroups = buildWeekGroups(days);

  return (
    <div className="sticky top-0 z-[3] border-b-2 border-border bg-card">
      {/* Week group row */}
      <div className="flex">
        {/* Empty corner cell aligned with worker name column */}
        <div className="w-[180px] max-w-[220px] min-w-[180px] shrink-0 border-r border-border/50" />
        {/* Week spans */}
        <div className="flex flex-1">
          {weekGroups.map(({ weekNum, count }, idx) => (
            <div
              key={`week-${weekNum}-${idx}`}
              className={cn(
                'flex items-center border-r border-border/50 bg-muted/50 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground',
                // Thick left border marks week boundary (all groups except the first)
                idx > 0 && 'border-l-2 border-l-border',
              )}
              style={{ minWidth: `${count * 60}px`, width: `${count * 60}px` }}
            >
              W{weekNum}
            </div>
          ))}
        </div>
      </div>

      {/* Day header row */}
      <div className="flex">
        {/* Worker column header */}
        <div className="sticky left-0 z-[4] flex w-[180px] max-w-[220px] min-w-[180px] shrink-0 items-center justify-between border-r border-border/50 bg-card px-2 py-1">
          <span className="text-sm text-foreground">{t('workers')}</span>
          {workerColumn && onSort && onFilter && (
            <ColumnSortFilterMenu
              column={workerColumn}
              currentSort={currentSort}
              currentFilter={currentFilter}
              onSort={onSort}
              onFilter={onFilter}
            />
          )}
        </div>
        {/* Day cells */}
        <div className="flex flex-1">
          {days.map((d) => {
            const isWeekend = d.day() === 0 || d.day() === 6;
            const isToday = d.isSame(today, 'day');
            const isWeekBoundary = d.isoWeekday() === 1;
            return (
              <div
                key={d.format('YYYY-MM-DD')}
                className={cn(
                  'flex h-14 min-w-[60px] flex-col items-center justify-center border-r border-border/50 px-2',
                  isWeekend ? 'bg-muted' : 'bg-card',
                  isWeekBoundary && 'border-l-2 border-l-border',
                )}
                data-testid={`date-header-${d.format('YYYY-MM-DD')}`}
              >
                {/* Day number — circle highlight for today */}
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none font-semibold',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {d.date()}
                </div>
                {/* 3-char weekday abbreviation */}
                <div className="mt-0.5 text-[11px] leading-none text-muted-foreground">
                  {d.format('ddd')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Body component
function RequestCalendarBody({
  workers,
  days,
  shifts,
  getRequestForDay,
  handleAddRequest,
  handleUpdateRequest,
  lng,
  teamId,
  onCellClick,
  onRequestClick,
}: RequestCalendarBodyProps) {
  return (
    <div className="flex flex-col bg-card">
      {workers.map((worker) => (
        <RequestCalendarRow
          key={worker.id}
          worker={worker}
          days={days}
          shifts={shifts}
          getRequestForDay={getRequestForDay}
          handleAddRequest={handleAddRequest}
          handleUpdateRequest={handleUpdateRequest}
          lng={lng}
          teamId={teamId}
          onCellClick={onCellClick}
          onRequestClick={onRequestClick}
        />
      ))}
    </div>
  );
}

// Shared cell class for summary rows
const summaryCellClass =
  'min-w-[60px] min-h-[40px] flex items-center justify-center border-r border-border/50 text-sm font-semibold';

// Shared row label class for summary rows
const summaryLabelClass =
  'w-[180px] min-w-[180px] max-w-[220px] shrink-0 flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50 border-r border-border/80 sticky left-0 z-[2]';

// Staffing summary rows component
function StaffingSummaryRows({ days, staffingSummary, isCalculating }: StaffingSummaryRowsProps) {
  if (isCalculating || !staffingSummary) {
    return <StaffingSummaryLoadingIndicator days={days} />;
  }

  const summaryRows: Array<{
    key: 'demand' | 'available' | 'delta';
    label: string;
  }> = [
    { key: 'demand', label: 'Demand' },
    { key: 'available', label: 'Offer' },
    { key: 'delta', label: 'Delta' },
  ];

  return (
    <>
      {summaryRows.map(({ key, label }) => (
        <div key={key} className="flex min-h-[40px] items-stretch border-b border-border/50">
          <div className={summaryLabelClass} title={label}>
            {label}
          </div>
          <div className="flex flex-1">
            {days.map((d) => {
              const dateKey = d.format('YYYY-MM-DD');
              const summary = staffingSummary[dateKey] || { demand: 0, available: 0, delta: 0 };
              const value = summary[key];
              const isWeekBoundary = d.isoWeekday() === 1;

              // Delta-specific colour coding
              let deltaClass = '';
              if (key === 'delta') {
                deltaClass =
                  value < 0
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300';
              }

              return (
                <div
                  key={dateKey}
                  className={cn(
                    summaryCellClass,
                    isWeekBoundary && 'border-l-2 border-l-border',
                    deltaClass,
                  )}
                >
                  {value}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

// Main table component
export default function RequestCalendarTable({
  workers,
  days,
  shifts,
  getRequestForDay,
  handleAddRequest,
  handleUpdateRequest,
  lng,
  teamId,
  onCellClick,
  onRequestClick,
  staffingSummary,
  isCalculating,
  currentSort,
  currentFilter,
  onSort,
  onFilter,
  workerColumn,
}: RequestCalendarTableProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-auto rounded border border-border/50',
        'h-[calc(100vh-185px)]',
        // Scrollbar styling via arbitrary variants isn't possible in Tailwind v3 standard,
        // but the browser default scrollbar is fine here.
      )}
    >
      {/* Calendar Header */}
      <RequestCalendarHeader
        lng={lng}
        days={days}
        currentSort={currentSort}
        currentFilter={currentFilter}
        onSort={onSort}
        onFilter={onFilter}
        workerColumn={workerColumn}
      />

      {/* Staffing Summary Rows */}
      {staffingSummary !== null && (
        <StaffingSummaryRows
          days={days}
          staffingSummary={staffingSummary}
          isCalculating={isCalculating}
        />
      )}

      {/* Calendar Body */}
      <RequestCalendarBody
        workers={workers}
        days={days}
        shifts={shifts}
        getRequestForDay={getRequestForDay}
        handleAddRequest={handleAddRequest}
        handleUpdateRequest={handleUpdateRequest}
        lng={lng}
        teamId={teamId}
        onCellClick={onCellClick}
        onRequestClick={onRequestClick}
      />
    </div>
  );
}
