import React from "react";
import dayjs, { Dayjs } from "dayjs";
import "./request-calendar.css";
import { StaffingSummaryLoadingIndicator } from "./StaffingSummaryLoadingIndicator";
import { RequestT } from "../../types/request";

type WorkerT = {
  id: string;
  name: string;
};

type StatusColors = {
  [key: string]: string;
};

import { DailyShiftDemandT } from "../../types/daily-shift-demand";
import { ShiftT } from "../../types/shift";

type RequestCalendarProps = {
  workers: WorkerT[];
  requests: RequestT[];
  statusColors?: StatusColors;
  demands?: DailyShiftDemandT[];
  shifts?: ShiftT[];
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
    days.push(month.date(i).utc());
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
  demands = [],
  shifts = [],
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(
    dayjs().utc().startOf("month")
  );
  const [showPending, setShowPending] = React.useState(true);
  const [showAcceptedNotFulfilled, setShowAcceptedNotFulfilled] =
    React.useState(true);
  const [showFulfilled, setShowFulfilled] = React.useState(true);
  // Memoize days to avoid unnecessary rerenders and effect triggers
  const days = React.useMemo(
    () => getDaysInMonth(currentMonth),
    [currentMonth]
  );

  // Progressive loading state for staffing summary
  const [staffingSummary, setStaffingSummary] =
    React.useState<StaffingSummary | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);

  // --- STAFFING TABLE LOGIC ---
  // Helper: get all shifts for this team (if provided)
  const shiftMap: { [id: string]: ShiftT } = {};
  for (const shift of shifts) {
    shiftMap[shift.id] = shift;
  }

  // Helper: get all demands for this month (memoized)
  const monthDemands = React.useMemo(
    () => demands.filter((d) => d.date.isSame(currentMonth, "month")),
    [demands, currentMonth]
  );

  // --- PERFORMANCE OPTIMIZED: Precompute all values for the month ---
  type StaffingSummary = {
    [date: string]: {
      demand: number;
      available: number;
      delta: number;
    };
  };

  // Map workerId to requests for quick lookup (move up for use in summary)
  const requestsByWorker = React.useMemo(() => {
    const map: { [workerId: string]: RequestT[] } = {};
    for (const req of requests) {
      if (!map[req.workerId]) map[req.workerId] = [];
      map[req.workerId].push(req);
    }
    return map;
  }, [requests]);

  // Progressive calculation of staffing summary (deferred, fixed infinite loop)
  React.useEffect(() => {
    setStaffingSummary(null);
    setIsCalculating(true);
    let cancelled = false;
    const timerId = setTimeout(() => {
      if (cancelled) return;
      if (demands.length > 0 && shifts.length > 0) {
        const summary: StaffingSummary = {};
        // Preprocess leave requests for O(1) lookup
        const workerLeaves: Record<string, Record<string, boolean>> = {};
        for (const worker of workers) {
          const workerReqs = requestsByWorker[worker.id] || [];
          for (const req of workerReqs) {
            if (req.requestType === "leave" && req.status === "approved") {
              let current = dayjs.max(
                req.startDate,
                currentMonth.startOf("month")
              );
              const lastDay = dayjs.min(
                req.endDate,
                currentMonth.endOf("month")
              );
              while (!current.isAfter(lastDay, "day")) {
                const dateKey = current.format("YYYY-MM-DD");
                if (!workerLeaves[worker.id]) workerLeaves[worker.id] = {};
                workerLeaves[worker.id][dateKey] = true;
                current = current.add(1, "day");
              }
            }
          }
        }
        for (const day of days) {
          const dateKey = day.format("YYYY-MM-DD");
          // Demand calculation
          let totalDemand = 0;
          for (const shift of shifts) {
            const demandsForShift = monthDemands.filter(
              (d) => d.date.isSame(day, "day") && d.shiftId === shift.id
            );

            const demandCount = demandsForShift.reduce(
              (sum, d) => sum + d.count,
              0
            );
            const shiftStaffing = shift.staffing.reduce(
              (sum, s) =>
                sum + (typeof s.staffing === "number" ? s.staffing : 0),
              0
            );
            totalDemand += demandCount * shiftStaffing;
          }
          // Available staff calculation (O(1) lookup)
          let available = 0;
          for (const worker of workers) {
            if (!workerLeaves[worker.id] || !workerLeaves[worker.id][dateKey]) {
              available++;
            }
          }
          summary[dateKey] = {
            demand: totalDemand,
            available,
            delta: available - totalDemand,
          };
        }
        if (!cancelled) {
          setStaffingSummary(summary);
          setIsCalculating(false);
        }
      } else {
        setIsCalculating(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [
    currentMonth,
    workers,
    shifts,
    demands,
    requestsByWorker,
    days,
    monthDemands,
  ]);

  // // Map workerId to requests for quick lookup
  // const requestsByWorker: { [workerId: string]: RequestT[] } = {};
  // for (const req of requests) {
  //   if (!requestsByWorker[req.workerId]) requestsByWorker[req.workerId] = [];
  //   requestsByWorker[req.workerId].push(req);
  // }

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
  const handleToday = () => setCurrentMonth(dayjs().utc().startOf("month"));

  // --- END STAFFING TABLE LOGIC ---

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

      {/* STAFFING TABLE ROWS */}
      {demands.length > 0 &&
        shifts.length > 0 &&
        (isCalculating || !staffingSummary ? (
          <StaffingSummaryLoadingIndicator days={days} />
        ) : (
          <>
            {/* Program staffing requirement */}
            <div className="calendar-row">
              <div className="calendar-row__name" style={{ fontWeight: 600 }}>
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
              <div className="calendar-row__name" style={{ fontWeight: 600 }}>
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
              <div className="calendar-row__name" style={{ fontWeight: 600 }}>
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
        ))}
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
