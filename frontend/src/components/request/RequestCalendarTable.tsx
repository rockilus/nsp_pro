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
import { useTranslation } from '../../app/i18n/client';
import CalendarTableHeader from '../calendar/CalendarTableHeader';
import CalendarRowHeaderCell from '../calendar/CalendarRowHeaderCell';

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
        'relative flex min-h-[40px] min-w-[60px] flex-1 items-center justify-center border-r border-border/50 p-1 text-sm transition-all duration-200',
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
        !request && (canAddRequest || canEditRequest) && 'group cursor-pointer',
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
      {/* Add button for clickable empty cells — inset so it has room from the cell border */}
      {!request && (canAddRequest || canEditRequest) && (
        <div className="absolute inset-1 flex items-center justify-center rounded border border-dashed border-primary/50 bg-primary/[0.08] opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-sm leading-none font-bold text-primary/70">+</span>
        </div>
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
    <div className="flex min-h-[40px] items-stretch border-b border-border/50">
      {/* Sticky worker name column */}
      <CalendarRowHeaderCell>
        <span
          className="truncate py-2 text-sm font-medium whitespace-nowrap text-foreground"
          title={worker.name}
        >
          {worker.name}
        </span>
      </CalendarRowHeaderCell>
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
  'flex-1 min-w-[60px] min-h-[40px] flex items-center justify-center border-r border-border/50 text-sm font-semibold';

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

// Thin wrapper so the shared CalendarTableHeader can read the 'workers' i18n label
// from this page's namespace without leaking request-page concerns into the shared component.
function CalendarTableHeaderWithWorkerLabel({
  lng,
  days,
  workerColumn,
  currentSort,
  currentFilter,
  onSort,
  onFilter,
}: {
  lng?: string;
  days: Dayjs[];
  workerColumn?: ColumnDefinition;
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
}) {
  const { t } = useTranslation(lng || 'en', 'request-page');
  return (
    <CalendarTableHeader
      lng={lng}
      days={days}
      rowHeaderLabel={t('workers')}
      rowColumn={workerColumn}
      currentSort={currentSort}
      currentFilter={currentFilter}
      onSort={onSort}
      onFilter={onFilter}
    />
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
      <CalendarTableHeaderWithWorkerLabel
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
