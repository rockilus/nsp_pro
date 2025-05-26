import React from "react";
import dayjs, { Dayjs } from "dayjs";
import "./request-calendar.css";
import { RequestT } from "../../types/request";

type WorkerT = {
  id: string;
  name: string;
};

type StatusColors = {
  [key: string]: string;
};

type RequestCalendarProps = {
  workers: WorkerT[];
  requests: RequestT[];
  statusColors?: StatusColors;
};

const defaultStatusColors: StatusColors = {
  pending: "#FFC107", // orange
  approved: "#4CAF50", // green
  fulfilled: "#2196F3", // blue
  denied: "#F44336", // red
  deferred: "#9E9E9E", // grey
  not_processed: "#BDBDBD",
  unfulfilled: "#E57373",
};

const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

function getDaysInMonth(month: Dayjs) {
  const days = [];
  const daysCount = month.daysInMonth();
  for (let i = 1; i <= daysCount; i++) {
    days.push(month.date(i));
  }
  return days;
}

function getStatusColor(request: RequestT, statusColors: StatusColors) {
  // Prefer fulfillment if not processed, else status
  if (request.fulfillment && statusColors[request.fulfillment]) {
    return statusColors[request.fulfillment];
  }
  if (request.status && statusColors[request.status]) {
    return statusColors[request.status];
  }
  return "#BDBDBD";
}

export const RequestCalendar: React.FC<RequestCalendarProps> = ({
  workers,
  requests,
  statusColors = defaultStatusColors,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(
    dayjs().startOf("month")
  );
  const [showPending, setShowPending] = React.useState(true);
  const [showAcceptedNotFulfilled, setShowAcceptedNotFulfilled] =
    React.useState(true);
  const [showFulfilled, setShowFulfilled] = React.useState(true);
  const days = getDaysInMonth(currentMonth);

  // Map workerId to requests for quick lookup
  const requestsByWorker: { [workerId: string]: RequestT[] } = {};
  for (const req of requests) {
    if (!requestsByWorker[req.workerId]) requestsByWorker[req.workerId] = [];
    requestsByWorker[req.workerId].push(req);
  }

  // Helper: category check
  function isPending(req: RequestT) {
    return req.status === "pending";
  }
  function isAcceptedNotFulfilled(req: RequestT) {
    return req.status === "approved" && req.fulfillment !== "fulfilled";
  }
  function isFulfilled(req: RequestT) {
    return req.status === "approved" && req.fulfillment === "fulfilled";
  }

  // For each worker, for each day, find if a request covers that day and is visible
  function getRequestForDay(workerId: string, day: Dayjs): RequestT | null {
    const reqs = requestsByWorker[workerId] || [];
    return (
      reqs.find((r) => {
        const inRange =
          !day.isBefore(r.startDate, "day") && !day.isAfter(r.endDate, "day");
        if (!inRange) return false;
        if (isPending(r) && showPending) return true;
        if (isAcceptedNotFulfilled(r) && showAcceptedNotFulfilled) return true;
        if (isFulfilled(r) && showFulfilled) return true;
        return false;
      }) || null
    );
  }

  // Month navigation handlers
  const handlePrevMonth = () => setCurrentMonth((m) => m.subtract(1, "month"));
  const handleNextMonth = () => setCurrentMonth((m) => m.add(1, "month"));
  const handleToday = () => setCurrentMonth(dayjs().startOf("month"));

  return (
    <div className="request-calendar">
      {/* Top Controls: Status Legend & Month Selector */}
      <div className="calendar-top-controls">
        <div className="calendar-month-selector">
          <button
            className="calendar-month-selector__today"
            onClick={handleToday}
          >
            Today
          </button>
          <button
            className="calendar-month-selector__arrow"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            &#8592;
          </button>
          <button
            className="calendar-month-selector__arrow"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            &#8594;
          </button>
          <span className="calendar-month-selector__label">
            {currentMonth.format("MMMM YYYY")}
          </span>
        </div>
        <div className="calendar-status-legend">
          <button
            className={`calendar-status-legend__btn${
              showPending ? " calendar-status-legend__btn--active" : ""
            }`}
            type="button"
            onClick={() => setShowPending((v) => !v)}
            aria-pressed={showPending}
          >
            <span className="calendar-status-legend__dot calendar-status-legend__dot--pending" />
            Pending
          </button>
          <button
            className={`calendar-status-legend__btn${
              showAcceptedNotFulfilled
                ? " calendar-status-legend__btn--active"
                : ""
            }`}
            type="button"
            onClick={() => setShowAcceptedNotFulfilled((v) => !v)}
            aria-pressed={showAcceptedNotFulfilled}
          >
            <span className="calendar-status-legend__dot calendar-status-legend__dot--accepted-not-fulfilled" />
            Accepted not fulfilled
          </button>
          <button
            className={`calendar-status-legend__btn${
              showFulfilled ? " calendar-status-legend__btn--active" : ""
            }`}
            type="button"
            onClick={() => setShowFulfilled((v) => !v)}
            aria-pressed={showFulfilled}
          >
            <span className="calendar-status-legend__dot calendar-status-legend__dot--fulfilled" />
            Fulfilled
          </button>
        </div>
      </div>
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-header__empty" />
        <div className="calendar-header__days">
          {days.map((d) => (
            <div key={d.date()} className="calendar-header__day">
              <div className="calendar-header__day-number">{d.date()}</div>
              <div className="calendar-header__day-week">
                {daysOfWeek[d.day() === 0 ? 6 : d.day() - 1]}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Calendar Body */}
      <div className="calendar-body">
        {workers.map((worker) => (
          <div className="calendar-row" key={worker.id}>
            <div className="calendar-row__name">{worker.name}</div>
            <div className="calendar-row__days">
              {days.map((d) => {
                const req = getRequestForDay(worker.id, d);
                return (
                  <div
                    key={d.date()}
                    className={`calendar-cell${
                      req ? " calendar-cell--leave" : ""
                    }`}
                    style={{
                      background: req
                        ? getStatusColor(req, statusColors)
                        : undefined,
                    }}
                  >
                    {req && (
                      <div className="calendar-cell__tooltip">
                        <div>
                          <strong>Status:</strong> {req.status}
                        </div>
                        <div>
                          <strong>From:</strong> {req.startDate.format("DD/MM")}
                        </div>
                        <div>
                          <strong>To:</strong> {req.endDate.format("DD/MM")}
                        </div>
                        {req.comment && (
                          <div>
                            <strong>Comment:</strong> {req.comment}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Example usage
/*
import dayjs from "dayjs";
import { RequestCalendar } from "./request-calendar";
import { RequestT } from "../../types/request";

const workers = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

const requests: RequestT[] = [
  {
    id: "r1",
    teamId: "t1",
    requestType: "leave",
    workerId: "1",
    startDate: dayjs("2025-02-10"),
    endDate: dayjs("2025-02-12"),
    shiftId: "",
    negative: false,
    hard: false,
    status: "pending",
    fulfillment: "not_processed",
    comment: "Vacation",
    createdAt: dayjs("2025-01-20"),
    active: true,
  },
  {
    id: "r2",
    teamId: "t1",
    requestType: "leave",
    workerId: "2",
    startDate: dayjs("2025-02-15"),
    endDate: dayjs("2025-02-18"),
    shiftId: "",
    negative: false,
    hard: false,
    status: "approved",
    fulfillment: "fulfilled",
    comment: "Family event",
    createdAt: dayjs("2025-01-22"),
    active: true,
  },
];

<RequestCalendar
  workers={workers}
  requests={requests}
  currentMonth={dayjs("2025-02-01")}
/>;
*/
