import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "./request-calendar.css";
import { StaffingSummaryLoadingIndicator } from "./StaffingSummaryLoadingIndicator";
import { RequestT } from "../../types/request";
import { WorkerT } from "../../types/worker";
import RequestPanel from "./request-panel";
import { RequestCalendarToolbar } from "./RequestCalendarToolbar";
import { ShiftDemandDTO } from "../../types/shiftDemand";
import { ShiftT } from "../../types/shift";
import {
  RequestType,
  RequestStatus,
  FulfillmentStatus,
} from "../../types/request";

dayjs.extend(isoWeek);

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

interface RequestCalendarProps {
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
}

interface RequestCalendarCellProps {
  worker: WorkerT;
  date: Dayjs;
  request: RequestT | null;
  statusColors: StatusColors;
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

// Utility functions
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

// Individual cell component
function RequestCalendarCell({
  worker,
  date,
  request,
  statusColors,
  canAddRequest,
  canEditRequest,
  isPast,
  isEmpty,
  onCellClick,
  onRequestClick,
}: RequestCalendarCellProps) {
  const isPastEmpty = isPast && isEmpty;

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

  return (
    <div
      key={date.date()}
      className={`calendar-cell${request ? " calendar-cell--leave" : ""}${
        canAddRequest || canEditRequest ? " calendar-cell--clickable" : ""
      }${isPastEmpty ? " calendar-cell--past" : ""}`}
      style={{
        background: request ? getStatusColor(request, statusColors) : undefined,
        cursor: canAddRequest || canEditRequest ? "pointer" : "default",
      }}
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
  );
}

// Body component
function RequestCalendarBody({
  workers,
  days,
  statusColors,
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

// Main calendar component
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
  // State management
  const [currentMonth, setCurrentMonth] = React.useState(
    dayjs().utc().startOf("month")
  );
  const [timeFrame, setTimeFrame] = React.useState<"week" | "month">("month");
  const [showPending, setShowPending] = React.useState(true);
  const [showAcceptedNotFulfilled, setShowAcceptedNotFulfilled] =
    React.useState(true);
  const [showFulfilled, setShowFulfilled] = React.useState(true);
  const [showDenied, setShowDenied] = React.useState(true);
  const [showWorkDemand, setShowWorkDemand] = React.useState(true);
  const [showLeave, setShowLeave] = React.useState(true);
  const [selectedCell, setSelectedCell] = React.useState<{
    workerId: string;
    date: Dayjs;
  } | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<RequestT | null>(
    null
  );
  const [staffingSummary, setStaffingSummary] =
    React.useState<StaffingSummary | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);

  // Calculate current period
  const currentPeriod = React.useMemo(() => {
    if (timeFrame === "month") {
      return {
        start: currentMonth.startOf("month"),
        end: currentMonth.endOf("month"),
      };
    } else {
      return {
        start: currentMonth.startOf("isoWeek"),
        end: currentMonth.endOf("isoWeek"),
      };
    }
  }, [currentMonth, timeFrame]);

  // Memoize days based on the current period
  const days = React.useMemo(
    () => getDaysInPeriod(currentPeriod.start, currentPeriod.end),
    [currentPeriod]
  );

  // Get all demands for the current period
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

  // Map workerId to requests for quick lookup
  const requestsByWorker = React.useMemo(() => {
    const map: { [workerId: string]: RequestT[] } = {};
    for (const req of requests) {
      if (!map[req.workerId]) map[req.workerId] = [];
      map[req.workerId].push(req);
    }
    return map;
  }, [requests]);

  // Progressive calculation of staffing summary
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
          // Demand calculation
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
          // Available staff calculation
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

  // Helper functions for filtering
  const isPending = (req: RequestT) => req.status === "pending";
  const isAcceptedNotFulfilled = (req: RequestT) =>
    req.status === "approved" && req.fulfillment !== "fulfilled";
  const isFulfilled = (req: RequestT) =>
    req.status === "approved" && req.fulfillment === "fulfilled";
  const isDenied = (req: RequestT) => req.status === RequestStatus.DENIED;

  // Get request for a specific worker and day with filtering
  const getRequestForDay = React.useCallback(
    (workerId: string, day: Dayjs): RequestT | null => {
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
          if (isAcceptedNotFulfilled(r) && showAcceptedNotFulfilled)
            return true;
          if (isFulfilled(r) && showFulfilled) return true;
          if (isDenied(r) && showDenied) return true;
          return false;
        }) || null
      );
    },
    [
      requestsByWorker,
      showWorkDemand,
      showLeave,
      showPending,
      showAcceptedNotFulfilled,
      showFulfilled,
      showDenied,
    ]
  );

  // Event handlers
  const handlePeriodChange = (start: Dayjs, end: Dayjs) => {
    setCurrentMonth(start);
  };

  const handleTimeFrameChange = (newTimeFrame: "week" | "month") => {
    setTimeFrame(newTimeFrame);
    if (newTimeFrame === "month") {
      setCurrentMonth(currentMonth.startOf("month"));
    } else {
      setCurrentMonth(currentMonth.startOf("isoWeek"));
    }
  };

  const handleStatusFilterChange = (
    newShowPending: boolean,
    newShowAccepted: boolean,
    newShowDenied: boolean
  ) => {
    setShowPending(newShowPending);
    setShowAcceptedNotFulfilled(newShowAccepted);
    setShowFulfilled(newShowAccepted);
    setShowDenied(newShowDenied);
  };

  const handleRequestTypeFilterChange = (
    newShowWorkDemand: boolean,
    newShowLeave: boolean
  ) => {
    setShowWorkDemand(newShowWorkDemand);
    setShowLeave(newShowLeave);
  };

  const handleCellClick = (workerId: string, date: Dayjs) => {
    const existingRequest = getRequestForDay(workerId, date);

    if (!existingRequest && date.isBefore(dayjs().utc(), "day")) {
      return;
    }

    if (!existingRequest && handleAddRequest && lng && teamId) {
      setSelectedCell({ workerId, date });
    }
  };

  const handleRequestClick = (request: RequestT) => {
    if (handleUpdateRequest && lng && teamId) {
      setSelectedRequest(request);
    }
  };

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

  const handleCloseRequestPanel = () => {
    setSelectedCell(null);
    setSelectedRequest(null);
  };

  const handleRequestCreated = (request: RequestT) => {
    if (handleAddRequest) {
      handleAddRequest(request);
    }
    setSelectedCell(null);
  };

  const handleRequestUpdated = (request: RequestT) => {
    if (handleUpdateRequest) {
      handleUpdateRequest(request);
    }
    setSelectedRequest(null);
  };

  // Render
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
      <RequestCalendarHeader days={days} />

      {/* Staffing Summary Rows */}
      {demands.length > 0 && shifts.length > 0 && (
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
        getRequestForDay={getRequestForDay}
        handleAddRequest={handleAddRequest}
        handleUpdateRequest={handleUpdateRequest}
        lng={lng}
        teamId={teamId}
        onCellClick={handleCellClick}
        onRequestClick={handleRequestClick}
      />

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
