import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "./request-calendar.css";
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
import RequestCalendarTable from "./RequestCalendarTable";

dayjs.extend(isoWeek);

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

// Main calendar component
export const RequestCalendar: React.FC<RequestCalendarProps> = ({
  workers,
  requests,
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

      {/* Calendar Table */}
      <RequestCalendarTable
        workers={workers}
        days={days}
        shifts={shifts}
        getRequestForDay={getRequestForDay}
        handleAddRequest={handleAddRequest}
        handleUpdateRequest={handleUpdateRequest}
        lng={lng}
        teamId={teamId}
        onCellClick={handleCellClick}
        onRequestClick={handleRequestClick}
        staffingSummary={
          demands.length > 0 && shifts.length > 0 ? staffingSummary : null
        }
        isCalculating={isCalculating}
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
