import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "./request-calendar.css";
import { StaffingSummaryLoadingIndicator } from "./StaffingSummaryLoadingIndicator";
import { RequestT } from "../../types/request";
import { WorkerT } from "../../types/worker";
import RequestPanel from "./request-panel";
import { RequestCalendarToolbar } from "./RequestCalendarToolbar";

dayjs.extend(isoWeek);

type StatusColors = {
  [key: string]: string;
};

import { ShiftDemandDTO } from "../../types/shiftDemand";
import { ShiftT } from "../../types/shift";
import {
  RequestType,
  RequestStatus,
  FulfillmentStatus,
} from "../../types/request";

type RequestCalendarProps = {
  workers: WorkerT[];
  requests: RequestT[];
  statusColors?: StatusColors;
  demands?: ShiftDemandDTO[];
  shifts?: ShiftT[];
  lng?: string;
  teamId?: string;
  shiftOptions?: Array<any>;
  userTeamRole?: any;
  handleAddRequest?: (request: RequestT) => void;
  handleUpdateRequest?: (request: RequestT) => void;
  handleDeleteRequest?: (requestId: string) => void;
  handleRescindRequest?: (requestId: string) => void;
  handleAcceptRequest?: (requestId: string) => void;
  handleDenyRequest?: (requestId: string) => void;
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

function getDaysInPeriod(start: Dayjs, end: Dayjs) {
  const days = [];
  let current = start;
  while (!current.isAfter(end, "day")) {
    days.push(current);
    current = current.add(1, "day");
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
  lng,
  teamId,
  shiftOptions = [],
  userTeamRole,
  handleAddRequest,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(
    dayjs().utc().startOf("month")
  );
  const [timeFrame, setTimeFrame] = React.useState<"week" | "month">("month");
  const [showPending, setShowPending] = React.useState(true);
  const [showAcceptedNotFulfilled, setShowAcceptedNotFulfilled] =
    React.useState(true);
  const [showFulfilled, setShowFulfilled] = React.useState(true);
  // allow toggling visibility of denied (rejected) requests
  const [showDenied, setShowDenied] = React.useState(true);

  // State for request type filtering
  const [showWorkDemand, setShowWorkDemand] = React.useState(true);
  const [showLeave, setShowLeave] = React.useState(true);

  // State for calendar cell selection and request creation/editing
  const [selectedCell, setSelectedCell] = React.useState<{
    workerId: string;
    date: Dayjs;
  } | null>(null);

  // State for editing existing requests
  const [selectedRequest, setSelectedRequest] = React.useState<RequestT | null>(
    null
  );

  // Calculate current period for toolbar (needs to be before days calculation)
  const currentPeriod = React.useMemo(() => {
    if (timeFrame === "month") {
      return {
        start: currentMonth.startOf("month"),
        end: currentMonth.endOf("month"),
      };
    } else {
      // week
      return {
        start: currentMonth.startOf("isoWeek"),
        end: currentMonth.endOf("isoWeek"),
      };
    }
  }, [currentMonth, timeFrame]);

  // Memoize days based on the current period (week or month)
  const days = React.useMemo(
    () => getDaysInPeriod(currentPeriod.start, currentPeriod.end),
    [currentPeriod]
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

  // Helper: get all demands for the current period (memoized) - updated for ShiftDemandDTO
  const periodDemands = React.useMemo(
    () =>
      demands.filter((d) => {
        const demandDate = dayjs.unix(d.date).utc();
        return (
          !demandDate.isBefore(currentPeriod.start, "day") &&
          !demandDate.isAfter(currentPeriod.end, "day")
        );
      }),
    [demands, currentPeriod]
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
              let current = dayjs.max(req.startDate, currentPeriod.start);
              const lastDay = dayjs.min(req.endDate, currentPeriod.end);
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
          // Demand calculation - updated for ShiftDemandDTO
          let totalDemand = 0;
          for (const shift of shifts) {
            const demandsForShift = periodDemands.filter((d) => {
              const demandDate = dayjs.unix(d.date).utc();
              return demandDate.isSame(day, "day") && d.shiftId === shift.id;
            });

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
    currentPeriod,
    workers,
    shifts,
    demands,
    requestsByWorker,
    days,
    periodDemands,
  ]);

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
  function isDenied(req: RequestT) {
    return req.status === RequestStatus.DENIED;
  }

  // For each worker, for each day, find if a request covers that day and is visible
  function getRequestForDay(workerId: string, day: Dayjs): RequestT | null {
    const reqs = requestsByWorker[workerId] || [];
    return (
      reqs.find((r) => {
        const inRange =
          !day.isBefore(r.startDate, "day") && !day.isAfter(r.endDate, "day");
        if (!inRange) return false;

        // Check request type filter
        const isWorkDemandType = r.requestType === RequestType.WORK_DEMAND;
        const isLeaveType = r.requestType === RequestType.LEAVE;
        if (isWorkDemandType && !showWorkDemand) return false;
        if (isLeaveType && !showLeave) return false;

        // Check status filter
        if (isPending(r) && showPending) return true;
        if (isAcceptedNotFulfilled(r) && showAcceptedNotFulfilled) return true;
        if (isFulfilled(r) && showFulfilled) return true;
        if (isDenied(r) && showDenied) return true;
        return false;
      }) || null
    );
  }

  // New handlers for toolbar integration
  const handlePeriodChange = (start: Dayjs, end: Dayjs) => {
    // Store the start of the period (works for both week and month views)
    setCurrentMonth(start);
  };

  const handleTimeFrameChange = (newTimeFrame: "week" | "month") => {
    setTimeFrame(newTimeFrame);
    // Adjust currentMonth to align with the new time frame
    if (newTimeFrame === "month") {
      setCurrentMonth(currentMonth.startOf("month"));
    } else {
      // For week view, still use the month containing the current week
      setCurrentMonth(currentMonth.startOf("isoWeek"));
    }
  };

  // Handler for status filter changes from toolbar
  const handleStatusFilterChange = (
    newShowPending: boolean,
    newShowAccepted: boolean,
    newShowDenied: boolean
  ) => {
    setShowPending(newShowPending);
    // For "accepted", we control both accepted-not-fulfilled and fulfilled
    setShowAcceptedNotFulfilled(newShowAccepted);
    setShowFulfilled(newShowAccepted);
    setShowDenied(newShowDenied);
  };

  // Handler for request type filter changes from toolbar
  const handleRequestTypeFilterChange = (
    newShowWorkDemand: boolean,
    newShowLeave: boolean
  ) => {
    setShowWorkDemand(newShowWorkDemand);
    setShowLeave(newShowLeave);
  };

  // Handle calendar cell click for empty cells
  const handleCellClick = (workerId: string, date: Dayjs) => {
    const existingRequest = getRequestForDay(workerId, date);

    // Don't allow clicking on past empty cells
    if (!existingRequest && date.isBefore(dayjs().utc(), "day")) {
      return;
    }

    // Only allow clicking on empty cells (no existing request)
    if (!existingRequest && handleAddRequest && lng && teamId) {
      setSelectedCell({ workerId, date });
    }
  };

  // Handle clicking on existing requests to edit them
  const handleRequestClick = (request: RequestT) => {
    if (handleUpdateRequest && lng && teamId) {
      setSelectedRequest(request);
    }
  };

  // Create pre-populated request for selected cell
  const createPrePopulatedRequest = (
    workerId: string,
    date: Dayjs
  ): RequestT => ({
    id: "",
    teamId: teamId || "",
    requestType: RequestType.WORK_DEMAND,
    workerId: workerId,
    startDate: date,
    endDate: date,
    shiftId: null,
    shiftOptions: [],
    negative: false,
    hard: true,
    status: RequestStatus.PENDING,
    fulfillment: FulfillmentStatus.NOT_PROCESSED,
    comment: "",
    createdAt: dayjs.utc(),
    active: true,
    shiftTargetIds: [],
    missingAttributes: [],
  });

  // Handle closing the request panel
  const handleCloseRequestPanel = () => {
    setSelectedCell(null);
    setSelectedRequest(null);
  };

  // Handle successful request creation
  const handleRequestCreated = (request: RequestT) => {
    if (handleAddRequest) {
      handleAddRequest(request);
    }
    setSelectedCell(null);
  };

  // Handle successful request update
  const handleRequestUpdated = (request: RequestT) => {
    if (handleUpdateRequest) {
      handleUpdateRequest(request);
    }
    setSelectedRequest(null);
  };

  // --- END STAFFING TABLE LOGIC ---

  return (
    <div className="request-calendar" data-testid="request-calendar">
      {/* Toolbar with Time Navigation */}
      {lng && (
        <RequestCalendarToolbar
          lng={lng}
          currentPeriod={currentPeriod}
          onPeriodChange={handlePeriodChange}
          timeFrame={timeFrame}
          onTimeFrameChange={handleTimeFrameChange}
          showPending={showPending}
          showAccepted={showAcceptedNotFulfilled || showFulfilled}
          showDenied={showDenied}
          onStatusFilterChange={handleStatusFilterChange}
          showWorkDemand={showWorkDemand}
          showLeave={showLeave}
          onRequestTypeFilterChange={handleRequestTypeFilterChange}
        />
      )}

      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-header__empty" />
        <div className="calendar-header__days">
          {days.map((d) => (
            <div
              key={d.date()}
              className="calendar-header__day"
              data-testid={`date-header-${d.format("YYYY-MM-DD")}`}
            >
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
        ))}
      {/* Calendar Body */}
      <div className="calendar-body">
        {workers.map((worker) => (
          <div className="calendar-row" key={worker.id}>
            <div className="calendar-row__name" title={worker.name}>
              {worker.name}
            </div>
            <div className="calendar-row__days">
              {days.map((d) => {
                const req = getRequestForDay(worker.id, d);
                const isEmpty = !req;
                const isPast = d.isBefore(dayjs().utc(), "day");
                const isPastEmpty = isPast && isEmpty;
                const canAddRequest =
                  isEmpty && !isPast && !!handleAddRequest && !!lng && !!teamId;
                const canEditRequest =
                  !!req && !!handleUpdateRequest && !!lng && !!teamId;

                return (
                  <div
                    key={d.date()}
                    className={`calendar-cell${
                      req ? " calendar-cell--leave" : ""
                    }${
                      canAddRequest || canEditRequest
                        ? " calendar-cell--clickable"
                        : ""
                    }${isPastEmpty ? " calendar-cell--past" : ""}`}
                    style={{
                      background: req
                        ? getStatusColor(req, statusColors)
                        : undefined,
                      cursor:
                        canAddRequest || canEditRequest ? "pointer" : "default",
                    }}
                    data-testid={`calendar-cell-${worker.id}-${d.format(
                      "YYYY-MM-DD"
                    )}${req ? `-request-${req.id}` : ""}`}
                    onClick={() => {
                      if (canAddRequest) {
                        handleCellClick(worker.id, d);
                      } else if (canEditRequest && req) {
                        handleRequestClick(req);
                      }
                    }}
                    title={
                      isPastEmpty
                        ? `Past date - ${d.format("MMM D")}`
                        : canAddRequest
                        ? `Click to create request for ${
                            worker.name
                          } on ${d.format("MMM D")}`
                        : canEditRequest && req
                        ? `Click to edit ${req.requestType} request for ${
                            worker.name
                          } (${req.startDate.format(
                            "MMM D"
                          )} - ${req.endDate.format("MMM D")})`
                        : undefined
                    }
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

      {/* Request Panel for creating requests from calendar */}
      {selectedCell && lng && teamId && (
        <RequestPanel
          lng={lng}
          teamId={teamId}
          isEdit={false}
          request={createPrePopulatedRequest(
            selectedCell.workerId,
            selectedCell.date
          )}
          workers={workers.filter((w) => !w.deleted)}
          shifts={shifts}
          shiftOptions={shiftOptions}
          userWorkerId={selectedCell.workerId}
          userTeamRole={userTeamRole}
          handleAddRequest={handleRequestCreated}
          handleUpdateRequest={handleUpdateRequest || (() => {})}
          handleDeleteRequest={handleDeleteRequest}
          handleRescindRequest={handleRescindRequest}
          handleAcceptRequest={handleAcceptRequest}
          handleDenyRequest={handleDenyRequest}
          hideButton={true}
          onClose={handleCloseRequestPanel}
        />
      )}

      {/* Request Panel for editing existing requests from calendar */}
      {selectedRequest && lng && teamId && (
        <RequestPanel
          lng={lng}
          teamId={teamId}
          isEdit={true}
          request={selectedRequest}
          workers={workers.filter((w) => !w.deleted)}
          shifts={shifts}
          shiftOptions={shiftOptions}
          userWorkerId={selectedRequest.workerId}
          userTeamRole={userTeamRole}
          handleAddRequest={handleRequestUpdated}
          handleUpdateRequest={handleRequestUpdated}
          handleDeleteRequest={handleDeleteRequest}
          handleRescindRequest={handleRescindRequest}
          handleAcceptRequest={handleAcceptRequest}
          handleDenyRequest={handleDenyRequest}
          hideButton={true}
          onClose={handleCloseRequestPanel}
        />
      )}
    </div>
  );
};
