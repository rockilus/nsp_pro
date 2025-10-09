import React from "react";
import dayjs, { Dayjs } from "dayjs";
import "./RequestCalendarTable.css";
import { StaffingSummaryLoadingIndicator } from "./StaffingSummaryLoadingIndicator";
import { RequestT, RequestType } from "../../types/request";
import { WorkerT } from "../../types/worker";
import { ShiftT } from "../../types/shift";
import { ShiftColorMappings } from "../../constants/constants";

// Types
type StatusColors = {
  [key: string]: string;
};

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
  statusColors: StatusColors;
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
}

interface RequestCalendarCellProps {
  worker: WorkerT;
  date: Dayjs;
  request: RequestT | null;
  statusColors: StatusColors;
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
  statusColors: StatusColors;
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
  days: Dayjs[];
}

interface RequestCalendarBodyProps {
  workers: WorkerT[];
  days: Dayjs[];
  statusColors: StatusColors;
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

// Constants
const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

// Utility functions
function getStatusColor(
  request: RequestT,
  statusColors: StatusColors,
  shifts: ShiftT[]
) {
  // For leave requests, always use red
  if (request.requestType === RequestType.LEAVE) {
    return "#F44336"; // red
  }

  // For work demand requests, use shift color if available
  if (request.requestType === RequestType.WORK_DEMAND && request.shiftId) {
    const shift = shifts.find((s) => s.id === request.shiftId);
    if (shift) {
      const shiftColors = ShiftColorMappings[shift.color];
      if (shiftColors) {
        return shiftColors.background;
      }
    }
  }

  // Fallback to status colors for other cases
  if (request.fulfillment && statusColors[request.fulfillment]) {
    return statusColors[request.fulfillment];
  }
  if (request.status && statusColors[request.status]) {
    return statusColors[request.status];
  }
  return "#BDBDBD";
}

// Individual cell component
function RequestCalendarCell({
  worker,
  date,
  request,
  statusColors,
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
      return `Past date - ${date.format("MMM D")}`;
    }
    if (canAddRequest) {
      return `Click to create request for ${worker.name} on ${date.format(
        "MMM D"
      )}`;
    }
    if (canEditRequest && request) {
      return `Click to edit ${request.requestType} request for ${
        worker.name
      } (${request.startDate.format("MMM D")} - ${request.endDate.format(
        "MMM D"
      )})`;
    }
    return undefined;
  };

  // Get shift colors for CSS variables (similar to ShiftDemandCell)
  const getShiftColors = () => {
    if (request?.requestType === RequestType.WORK_DEMAND && request.shiftId) {
      const shift = shifts.find((s) => s.id === request.shiftId);
      if (shift) {
        const colors = ShiftColorMappings[shift.color] || {
          background: "#f5f5f5",
          sample: "#9e9e9e",
          text: "#212121",
        };
        return {
          background: colors.background,
          sample: colors.sample,
          text: colors.text,
        };
      }
    }
    // For leave requests, use red
    if (request?.requestType === RequestType.LEAVE) {
      return {
        background: "#F44336",
        sample: "#D32F2F",
        text: "#FFFFFF",
      };
    }
    return null;
  };

  const shiftColors = getShiftColors();

  return (
    <div
      key={date.date()}
      className={`calendar-cell${isWeekend ? " weekend" : ""}${
        request ? " calendar-cell--leave" : ""
      }${canAddRequest || canEditRequest ? " calendar-cell--clickable" : ""}${
        isPastEmpty ? " calendar-cell--past" : ""
      }`}
      style={
        {
          ...(shiftColors && {
            "--shift-bg-color": shiftColors.background,
            "--shift-sample-color": shiftColors.sample,
            "--shift-text-color": shiftColors.text,
            background: shiftColors.background,
          }),
          ...(!shiftColors &&
            request && {
              background: getStatusColor(request, statusColors, shifts),
            }),
          cursor: canAddRequest || canEditRequest ? "pointer" : "default",
        } as React.CSSProperties
      }
      data-testid={`calendar-cell-${worker.id}-${date.format("YYYY-MM-DD")}${
        request ? `-request-${request.id}` : ""
      }`}
      data-request-type={request ? request.requestType : undefined}
      data-request-status={request ? request.status : undefined}
      onClick={handleClick}
      title={getTitle()}
    >
      {request && (
        <div className="calendar-cell__tooltip">
          <div>
            <strong>Status:</strong> {request.status}
          </div>
          <div>
            <strong>From:</strong> {request.startDate.format("DD/MM")}
          </div>
          <div>
            <strong>To:</strong> {request.endDate.format("DD/MM")}
          </div>
          {request.comment && (
            <div>
              <strong>Comment:</strong> {request.comment}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Row component
function RequestCalendarRow({
  worker,
  days,
  statusColors,
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
    <div className="calendar-row" key={worker.id}>
      <div className="calendar-row__name" title={worker.name}>
        {worker.name}
      </div>
      <div className="calendar-row__days">
        {days.map((d) => {
          const request = getRequestForDay(worker.id, d);
          const isEmpty = !request;
          const isPast = d.isBefore(dayjs().utc(), "day");
          const canAddRequest =
            isEmpty && !isPast && !!handleAddRequest && !!lng && !!teamId;
          const canEditRequest =
            !!request && !!handleUpdateRequest && !!lng && !!teamId;

          return (
            <RequestCalendarCell
              key={d.date()}
              worker={worker}
              date={d}
              request={request}
              statusColors={statusColors}
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

// Header component
function RequestCalendarHeader({ days }: RequestCalendarHeaderProps) {
  return (
    <div className="calendar-header">
      <div className="calendar-header__empty" />
      <div className="calendar-header__days">
        {days.map((d) => {
          const isWeekend = d.day() === 0 || d.day() === 6;
          return (
            <div
              key={d.date()}
              className={`calendar-header__day${isWeekend ? " weekend" : ""}`}
              data-testid={`date-header-${d.format("YYYY-MM-DD")}`}
            >
              <div className="calendar-header__day-number">{d.date()}</div>
              <div className="calendar-header__day-week">
                {daysOfWeek[d.day() === 0 ? 6 : d.day() - 1]}
              </div>
            </div>
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
  statusColors,
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
    <div className="calendar-body">
      {workers.map((worker) => (
        <RequestCalendarRow
          key={worker.id}
          worker={worker}
          days={days}
          statusColors={statusColors}
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

// Staffing summary rows component
function StaffingSummaryRows({
  days,
  staffingSummary,
  isCalculating,
}: StaffingSummaryRowsProps) {
  if (isCalculating || !staffingSummary) {
    return <StaffingSummaryLoadingIndicator days={days} />;
  }

  return (
    <>
      {/* Program staffing requirement */}
      <div className="calendar-row">
        <div
          className="calendar-row__name"
          style={{ fontWeight: 600 }}
          title="Demand"
        >
          Demand
        </div>
        <div className="calendar-row__days">
          {days.map((d) => {
            const dateKey = d.format("YYYY-MM-DD");
            const summary = staffingSummary[dateKey] || {
              demand: 0,
              available: 0,
              delta: 0,
            };
            return (
              <div
                key={dateKey}
                className="calendar-cell"
                style={{
                  fontWeight: 600,
                }}
              >
                {summary.demand}
              </div>
            );
          })}
        </div>
      </div>
      {/* Current staff available */}
      <div className="calendar-row">
        <div
          className="calendar-row__name"
          style={{ fontWeight: 600 }}
          title="Offer"
        >
          Offer
        </div>
        <div className="calendar-row__days">
          {days.map((d) => {
            const dateKey = d.format("YYYY-MM-DD");
            const summary = staffingSummary[dateKey] || {
              demand: 0,
              available: 0,
              delta: 0,
            };
            return (
              <div
                key={dateKey}
                className="calendar-cell"
                style={{
                  fontWeight: 600,
                }}
              >
                {summary.available}
              </div>
            );
          })}
        </div>
      </div>
      {/* Delta */}
      <div className="calendar-row">
        <div
          className="calendar-row__name"
          style={{ fontWeight: 600 }}
          title="Delta"
        >
          Delta
        </div>
        <div className="calendar-row__days">
          {days.map((d) => {
            const dateKey = d.format("YYYY-MM-DD");
            const summary = staffingSummary[dateKey] || {
              demand: 0,
              available: 0,
              delta: 0,
            };
            const delta = summary.delta;
            const isNegative = delta < 0;
            return (
              <div
                key={dateKey}
                className={`calendar-cell calendar-cell--delta${
                  isNegative
                    ? " calendar-cell--delta-negative"
                    : " calendar-cell--delta-positive"
                }`}
              >
                {delta}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Main table component
export default function RequestCalendarTable({
  workers,
  days,
  statusColors,
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
}: RequestCalendarTableProps) {
  return (
    <div className="request-calendar-table">
      {/* Calendar Header */}
      <RequestCalendarHeader days={days} />

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
        statusColors={statusColors}
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
