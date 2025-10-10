import React from "react";
import dayjs, { Dayjs } from "dayjs";
import "./RequestCalendarTable.css";
import { StaffingSummaryLoadingIndicator } from "./StaffingSummaryLoadingIndicator";
import {
  RequestT,
  RequestType,
  RequestStatus,
  FulfillmentStatus,
} from "../../types/request";
import { WorkerT } from "../../types/worker";
import { ShiftT } from "../../types/shift";
import { ShiftColorMappings } from "../../constants/constants";
import { SWOIdTypes } from "../../types/constraint";

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
  days: Dayjs[];
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

// Constants
const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

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
    // For work demand requests, check shiftOptions
    if (request?.requestType === RequestType.WORK_DEMAND) {
      // If there's exactly one shift option with type SHIFT, use that shift's color
      if (
        request.shiftOptions &&
        request.shiftOptions.length === 1 &&
        request.shiftOptions[0].idType === SWOIdTypes.SHIFT
      ) {
        const shiftOption = request.shiftOptions[0];
        const shift = shifts.find((s) => s.id === shiftOption.id);
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
      // Otherwise, use default work request colors (grey)
      return {
        background: "#f5f5f5",
        sample: "#9e9e9e",
        text: "#212121",
      };
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

  // Get emoji indicators for the request
  const getRequestEmojis = () => {
    if (!request) return null;

    const emojis: string[] = [];

    // Work request type indicator (negative vs positive)
    if (request.requestType === RequestType.WORK_DEMAND) {
      if (request.negative) {
        emojis.push("🙅"); // Person gesturing no
      } else {
        emojis.push("🙋"); // Person raising one hand
      }
    }

    // Status indicator
    switch (request.status) {
      case RequestStatus.PENDING:
        emojis.push("🟠"); // Orange circle
        break;
      case RequestStatus.APPROVED:
        emojis.push("🟢"); // Green circle
        break;
      case RequestStatus.DENIED:
        emojis.push("🔴"); // Red circle
        break;
    }

    // Fulfillment indicator (only show for approved requests)
    if (request.status === RequestStatus.APPROVED) {
      switch (request.fulfillment) {
        case FulfillmentStatus.FULFILLED:
          emojis.push("✅"); // Check mark
          break;
        case FulfillmentStatus.UNFULFILLED:
          emojis.push("❌"); // Cross mark
          break;
      }
    }

    return emojis.join(" ");
  };

  const requestEmojis = getRequestEmojis();

  // Get status-specific CSS class
  const getStatusClass = () => {
    if (!request) return "";

    switch (request.status) {
      case RequestStatus.PENDING:
        return " calendar-cell--status-pending";
      case RequestStatus.DENIED:
        return " calendar-cell--status-denied";
      case RequestStatus.APPROVED:
      default:
        return "";
    }
  };

  return (
    <div
      key={date.date()}
      className={`calendar-cell${isWeekend ? " weekend" : ""}${
        request ? " calendar-cell--leave" : ""
      }${canAddRequest || canEditRequest ? " calendar-cell--clickable" : ""}${
        isPastEmpty ? " calendar-cell--past" : ""
      }${getStatusClass()}`}
      style={
        {
          ...(shiftColors && {
            "--shift-bg-color": shiftColors.background,
            "--shift-sample-color": shiftColors.sample,
            "--shift-text-color": shiftColors.text,
            background: shiftColors.background,
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
      {request && requestEmojis && (
        <div className="calendar-cell__emojis">{requestEmojis}</div>
      )}
      {request && (
        <div className="calendar-cell__tooltip">
          {/* Target shift / work request target */}
          <div>
            <strong>Target:</strong>{" "}
            {request.requestType === RequestType.LEAVE
              ? // For leave requests, show the shift name if provided in shiftTargetIds
                // We'll try to find the matching shift name from the shifts prop based on shiftTargetIds[0]
                (() => {
                  const shiftId =
                    request.shiftTargetIds && request.shiftTargetIds[0];
                  if (shiftId) {
                    const shift = shifts.find((s) => s.id === shiftId);
                    return shift ? shift.name : shiftId;
                  }
                  return "—";
                })()
              : // Work requests: show emoji for negative/positive then target shift names from shiftOptions
                (() => {
                  const emoji = request.negative ? "🙅" : "🙋";
                  const shiftNames: string[] = [];
                  if (request.shiftOptions && request.shiftOptions.length > 0) {
                    request.shiftOptions.forEach((so) => {
                      if (so.idType === SWOIdTypes.SHIFT) {
                        const s = shifts.find((sh) => sh.id === so.id);
                        shiftNames.push(
                          s ? s.name : so.name ? String(so.name) : so.id
                        );
                      }
                    });
                  }
                  return (
                    <span>
                      {emoji}{" "}
                      {shiftNames.length > 0 ? shiftNames.join(", ") : "—"}
                    </span>
                  );
                })()}
          </div>

          {/* Period: show formatted range if start != end */}
          <div>
            <strong>Period:</strong>{" "}
            {request.startDate.isSame(request.endDate, "day")
              ? request.startDate.format("DD MMM").toLowerCase()
              : `${request.startDate
                  .format("DD MMM")
                  .toLowerCase()} - ${request.endDate
                  .format("DD MMM")
                  .toLowerCase()}`}
          </div>

          {/* Status with traffic light emoji */}
          <div>
            <strong>Status:</strong>{" "}
            {(() => {
              let light = "";
              switch (request.status) {
                case RequestStatus.PENDING:
                  light = "🟠";
                  break;
                case RequestStatus.APPROVED:
                  light = "🟢";
                  break;
                case RequestStatus.DENIED:
                  light = "🔴";
                  break;
                default:
                  light = "";
              }
              return (
                <span>
                  {light} {request.status}
                </span>
              );
            })()}
          </div>

          {/* Fulfillment with check/cross emoji (only meaningful for approved requests) */}
          <div>
            <strong>Fulfillment:</strong>{" "}
            {(() => {
              let mark = "";
              switch (request.fulfillment) {
                case FulfillmentStatus.FULFILLED:
                  mark = "✅";
                  break;
                case FulfillmentStatus.UNFULFILLED:
                  mark = "❌";
                  break;
                default:
                  mark = "";
              }
              return (
                <span>
                  {mark} {request.fulfillment}
                </span>
              );
            })()}
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
