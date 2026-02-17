import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "./request-calendar.css";
import { RequestT, RequestViewSettingsT } from "../../types/request";
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
import { useTableState } from "../../hooks/useTableState";
import { createWorkerColumns } from "./workerColumns";
import TableFilterBar from "../table/TableFilterBar";
import { ColumnFilter } from "../../types/filter";

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
  viewSettings: RequestViewSettingsT;
  onUpdateViewSettings: (updates: Partial<RequestViewSettingsT>) => void;
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
  viewSettings,
  onUpdateViewSettings,
  handleAddRequest,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
}) => {
  // State management (use viewSettings for timeFrame and periodStartDate)
  const [selectedCell, setSelectedCell] = React.useState<{
    workerId: string;
    date: Dayjs;
  } | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<RequestT | null>(
    null,
  );
  const [staffingSummary, setStaffingSummary] =
    React.useState<StaffingSummary | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);

  // Column definitions for filtering (matching request table)
  const columns = React.useMemo(
    () => createWorkerColumns((key: string) => key, workers, shifts),
    [workers, shifts],
  );

  // Table state for filtering requests (in-memory only, synced with parent viewSettings)
  // Don't persist here - parent useRequestViewSettings handles all persistence
  const {
    tableState,
    filteredAndSortedData: filteredRequests,
    addFilter: addFilterInternal,
    removeFilter: removeFilterInternal,
    updateSort: updateSortInternal,
    resetAll: resetAllInternal,
  } = useTableState(
    requests,
    columns,
    undefined, // No storage key - parent manages persistence
  );

  // Sync viewSettings filters/sort into local tableState when they change
  React.useEffect(() => {
    // Only update if different to avoid infinite loops
    const filtersChanged =
      JSON.stringify(viewSettings.filters) !==
      JSON.stringify(tableState.filters);
    const sortChanged =
      JSON.stringify(viewSettings.sort) !== JSON.stringify(tableState.sort);

    if (filtersChanged || sortChanged) {
      // Reset and apply all filters from viewSettings
      viewSettings.filters.forEach((filter: ColumnFilter) =>
        addFilterInternal(filter),
      );
      if (viewSettings.sort !== tableState.sort) {
        updateSortInternal(viewSettings.sort);
      }
    }
  }, [
    viewSettings.filters,
    viewSettings.sort,
    tableState.filters,
    tableState.sort,
    addFilterInternal,
    updateSortInternal,
  ]);

  // Wrapped callbacks that update both local state and parent viewSettings
  const addFilter = React.useCallback(
    (filter: ColumnFilter) => {
      addFilterInternal(filter);
      onUpdateViewSettings({
        filters: [
          ...viewSettings.filters.filter(
            (f: ColumnFilter) => f.id !== filter.id,
          ),
          filter,
        ],
      });
    },
    [addFilterInternal, onUpdateViewSettings, viewSettings.filters],
  );

  const removeFilter = React.useCallback(
    (filterId: string) => {
      removeFilterInternal(filterId);
      onUpdateViewSettings({
        filters: viewSettings.filters.filter(
          (f: ColumnFilter) => f.id !== filterId,
        ),
      });
    },
    [removeFilterInternal, onUpdateViewSettings, viewSettings.filters],
  );

  const updateSort = React.useCallback(
    (sort: any) => {
      updateSortInternal(sort);
      onUpdateViewSettings({ sort });
    },
    [updateSortInternal, onUpdateViewSettings],
  );

  const resetAll = React.useCallback(() => {
    resetAllInternal();
    onUpdateViewSettings({ filters: [], sort: null });
  }, [resetAllInternal, onUpdateViewSettings]);

  // Apply worker filter and sort to determine which worker rows to show and their order
  const filteredWorkers = React.useMemo(() => {
    let result = [...workers];

    // Apply worker filter
    const workerFilter = tableState.filters.find((f) =>
      f.id.startsWith("workerId"),
    );
    if (workerFilter) {
      const filterValues = workerFilter.value as string[];
      result = result.filter((worker) => filterValues.includes(worker.id));
    }

    // Apply sorting if sort is on workerId column
    if (tableState.sort && tableState.sort.columnId === "workerId") {
      const workerColumn = columns.find((col) => col.id === "workerId");
      if (workerColumn) {
        result.sort((a, b) => {
          const aValue = workerColumn.getValue(a);
          const bValue = workerColumn.getValue(b);

          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;

          return tableState.sort!.direction === "desc"
            ? -comparison
            : comparison;
        });
      }
    }

    return result;
  }, [workers, tableState.filters, tableState.sort, columns]);

  // Calculate current period
  const currentPeriod = React.useMemo(() => {
    if (viewSettings.timeFrame === "month") {
      return {
        start: viewSettings.periodStartDate.startOf("month"),
        end: viewSettings.periodStartDate.endOf("month"),
      };
    } else {
      return {
        start: viewSettings.periodStartDate.startOf("isoWeek"),
        end: viewSettings.periodStartDate.endOf("isoWeek"),
      };
    }
  }, [viewSettings.periodStartDate, viewSettings.timeFrame]);

  // Memoize days based on the current period
  const days = React.useMemo(
    () => getDaysInPeriod(currentPeriod.start, currentPeriod.end),
    [currentPeriod],
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
    [demands, currentPeriod],
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
              0,
            );
            const shiftStaffing = shift.staffing.reduce(
              (sum, s) =>
                sum + (typeof s.staffing === "number" ? s.staffing : 0),
              0,
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

  // Helper functions for filtering - no longer needed since we use table state filters
  // Keeping them for reference but they're not used anymore

  // Get request for a specific worker and day with filtering
  const getRequestForDay = React.useCallback(
    (workerId: string, day: Dayjs): RequestT | null => {
      const reqs = requestsByWorker[workerId] || [];

      // Find the first request that matches all criteria
      return (
        reqs.find((r) => {
          // Check date range
          const inRange =
            !day.isBefore(r.startDate, "day") && !day.isAfter(r.endDate, "day");
          if (!inRange) return false;

          // Apply filters from tableState
          for (const filter of tableState.filters) {
            const column = columns.find((col) => col.id === filter.id);
            if (!column) continue;

            // Skip workerId filter (already applied to rows)
            if (filter.id.startsWith("workerId")) continue;

            const value = column.getValue(r);

            switch (filter.type) {
              case "text":
                if (
                  !String(value)
                    .toLowerCase()
                    .includes(String(filter.value).toLowerCase())
                ) {
                  return false;
                }
                break;

              case "select":
                if (Array.isArray(filter.value)) {
                  if (!filter.value.includes(value)) {
                    return false;
                  }
                } else {
                  if (value !== filter.value) {
                    return false;
                  }
                }
                break;

              case "date":
                const filterValue = filter.value as {
                  start?: string;
                  end?: string;
                };
                const dateStr = String(value); // Value should be in YYYY-MM-DD format
                if (filterValue.start && dateStr < filterValue.start) {
                  return false;
                }
                if (filterValue.end && dateStr > filterValue.end) {
                  return false;
                }
                break;

              case "boolean":
                if (value !== filter.value) {
                  return false;
                }
                break;
            }
          }

          // All filters passed
          return true;
        }) || null
      );
    },
    [requestsByWorker, tableState.filters, columns],
  );

  // Event handlers
  const handlePeriodChange = (start: Dayjs, end: Dayjs) => {
    onUpdateViewSettings({ periodStartDate: start });
  };

  const handleTimeFrameChange = (newTimeFrame: "week" | "month") => {
    // When changing time frame, ensure the period start is aligned to the new boundary
    const alignedStart = viewSettings.periodStartDate.startOf(
      newTimeFrame === "month" ? "month" : "isoWeek",
    );
    onUpdateViewSettings({
      timeFrame: newTimeFrame,
      periodStartDate: alignedStart,
    });
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
    date: Dayjs,
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
          timeFrame={viewSettings.timeFrame}
          onTimeFrameChange={handleTimeFrameChange}
          columns={columns}
          filters={tableState.filters}
          onFilter={addFilter}
        />
      )}

      {/* Filter Bar - shows active filters and sorting */}
      <TableFilterBar
        filters={tableState.filters}
        sort={tableState.sort}
        onRemoveFilter={removeFilter}
        onRemoveSort={() => updateSort(null)}
        onResetAll={resetAll}
      />

      {/* Calendar Table */}
      <RequestCalendarTable
        workers={filteredWorkers}
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
        // Worker filter/sort props
        currentSort={tableState.sort || undefined}
        currentFilter={tableState.filters.find((f) =>
          f.id.startsWith("workerId"),
        )}
        onSort={updateSort}
        onFilter={addFilter}
        workerColumn={columns[0]}
      />

      {/* Request Panel for creating requests from calendar */}
      {selectedCell && lng && teamId && (
        <RequestPanel
          lng={lng}
          teamId={teamId}
          isEdit={false}
          request={createPrePopulatedRequest(
            selectedCell.workerId,
            selectedCell.date,
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
