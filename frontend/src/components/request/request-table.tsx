import React, { useMemo } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import UndoIcon from "@mui/icons-material/Undo";
// Components
import RequestPanel from "./request-panel";
import ColumnSortFilterMenu from "../table/ColumnSortFilterMenu";
import TableFilterBar from "../table/TableFilterBar";
// Hooks
import { useTableState } from "../../hooks/useTableState";
// Utils
import { getShiftWorkerOptionDisplayText } from "../../utils/shift-worker-option-display";
// Styles
import "../../styles/table-styles.css";
// Types
import { WorkerT } from "../../types/worker";
import {
  RequestT,
  RequestStatus,
  FulfillmentStatus,
  RequestType,
} from "../../types/request";
import { ShiftT } from "../../types/shift";
import { TeamMembershipRole } from "@/types/team";
import { ShiftWorkerOptionT } from "@/types/constraint";
import { ColumnDefinition } from "../../types/filter";

// Helper components for better organization
const WorkerCell = ({
  request,
  workers,
}: {
  request: RequestT;
  workers: WorkerT[];
}) => {
  const worker = workers.find((w) => w.id === request.workerId);
  return (
    <div className="flex flex-col">
      <span className="font-medium">{worker?.name || "Unknown"}</span>
      {worker?.deleted && (
        <span className="text-xs text-red-500">Worker deleted</span>
      )}
    </div>
  );
};

const ShiftCell = ({
  request,
  shifts,
  workers,
  t,
}: {
  request: RequestT;
  shifts: ShiftT[];
  workers: WorkerT[];
  t: any;
}) => {
  if (request.requestType === RequestType.LEAVE) {
    if (!request.shiftId) {
      return <Chip label="All Day" size="small" variant="outlined" />;
    }
    const shift = shifts.find((s) => s.id === request.shiftId);
    return (
      <div className="flex flex-col">
        <span>{shift?.name || "Unknown"}</span>
        {shift?.deleted && (
          <span className="text-xs text-red-500">Shift deleted</span>
        )}
      </div>
    );
  } else {
    // Work request - show shift preferences
    if (request.shiftOptions.length === 0) {
      return <Chip label="No Preferences" size="small" variant="outlined" />;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {request.shiftOptions.map((option, index) => (
          <Chip
            key={index}
            label={`${getShiftWorkerOptionDisplayText(
              option,
              workers,
              shifts,
              t("not")
            )} ${request.negative ? "❌" : "✅"}`}
            size="small"
            variant="filled"
            color={request.negative ? "error" : "success"}
          />
        ))}
      </div>
    );
  }
};

const DateCell = ({ request }: { request: RequestT }) => {
  if (request.startDate.isSame(request.endDate, "day")) {
    return (
      <div className="flex flex-col">
        <span className="font-medium">{request.startDate.format("MMM D")}</span>
        <span className="text-xs text-gray-500">
          {request.startDate.format("dddd")}
        </span>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col">
        <span className="font-medium">
          {request.startDate.format("MMM D")} -{" "}
          {request.endDate.format("MMM D")}
        </span>
        <span className="text-xs text-gray-500">
          {request.startDate.format("ddd")} - {request.endDate.format("ddd")}
        </span>
      </div>
    );
  }
};

const TypeCell = ({ request }: { request: RequestT }) => {
  const isWork = request.requestType === RequestType.WORK_DEMAND;
  return (
    <div className="flex flex-col items-start gap-1">
      <Chip
        label={isWork ? "Work" : "Leave"}
        size="small"
        color={isWork ? "primary" : "secondary"}
        variant="filled"
      />
      {/* <Chip
        label={request.hard ? "Hard" : "Soft"}
        size="small"
        variant="outlined"
        color={request.hard ? "error" : "default"}
      /> */}
    </div>
  );
};

const StatusCell = ({ request, t }: { request: RequestT; t: any }) => {
  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return "success";
      case RequestStatus.DENIED:
        return "error";
      case RequestStatus.DEFERRED:
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return t("pending");
      case RequestStatus.APPROVED:
        return t("approved");
      case RequestStatus.DENIED:
        return t("rejected");
      // case RequestStatus.DEFERRED:
      //   return t("deferred");
      default:
        return "Unknown";
    }
  };

  return (
    <Chip
      label={getStatusLabel(request.status)}
      size="small"
      color={getStatusColor(request.status)}
      variant="filled"
    />
  );
};

const FulfillmentCell = ({ request }: { request: RequestT }) => {
  const getFulfillmentColor = (fulfillment: FulfillmentStatus) => {
    switch (fulfillment) {
      case FulfillmentStatus.FULFILLED:
        return "success";
      case FulfillmentStatus.UNFULFILLED:
        return "error";
      default:
        return "default";
    }
  };

  const getFulfillmentLabel = (fulfillment: FulfillmentStatus) => {
    switch (fulfillment) {
      case FulfillmentStatus.FULFILLED:
        return "Fulfilled";
      case FulfillmentStatus.UNFULFILLED:
        return "Unfulfilled";
      case FulfillmentStatus.NOT_PROCESSED:
        return "Not Processed";
      default:
        return "Unknown";
    }
  };

  return (
    <Chip
      label={getFulfillmentLabel(request.fulfillment)}
      size="small"
      color={getFulfillmentColor(request.fulfillment)}
      variant="outlined"
    />
  );
};

const ActionsCell = ({
  request,
  lng,
  workers,
  shifts,
  shiftOptions,
  userWorkerId,
  userTeamRole,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleApproveRequest,
}: {
  request: RequestT;
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleUpdateRequest: (request: RequestT) => void;
  handleDeleteRequest: (requestId: string) => void;
  handleRescindRequest: (requestId: string) => void;
  handleApproveRequest: (requestId: string) => void;
}) => {
  const canEdit =
    userTeamRole !== TeamMembershipRole.MEMBER ||
    (userWorkerId && request.workerId === userWorkerId);

  const canApprove =
    userTeamRole === TeamMembershipRole.OWNER &&
    request.status === RequestStatus.PENDING;

  const canRescind =
    userTeamRole === TeamMembershipRole.OWNER &&
    (request.status === RequestStatus.APPROVED ||
      request.status === RequestStatus.DENIED);

  return (
    <div className="flex items-center gap-1">
      <RequestPanel
        lng={lng}
        teamId={request.teamId}
        isEdit={true}
        request={request}
        workers={workers.filter((worker) => !worker.deleted)}
        shifts={shifts.filter((shift) => !shift.deleted)}
        shiftOptions={shiftOptions}
        userWorkerId={userWorkerId}
        userTeamRole={userTeamRole}
        handleAddRequest={handleUpdateRequest}
        handleUpdateRequest={handleUpdateRequest}
      />

      {canApprove && (
        <IconButton
          size="small"
          onClick={() => handleApproveRequest(request.id)}
          title="Approve Request"
          color="success"
        >
          <CheckIcon />
        </IconButton>
      )}

      {canApprove && (
        <IconButton
          size="small"
          onClick={() => {
            // Handle reject logic
            const updatedRequest = { ...request, status: RequestStatus.DENIED };
            handleUpdateRequest(updatedRequest);
          }}
          title="Reject Request"
          color="error"
        >
          <CloseIcon />
        </IconButton>
      )}

      {canRescind && (
        <IconButton
          size="small"
          onClick={() => handleRescindRequest(request.id)}
          title={`Rescind ${
            request.status === RequestStatus.APPROVED ? "Approval" : "Rejection"
          }`}
          color="warning"
        >
          <UndoIcon />
        </IconButton>
      )}

      <IconButton
        size="small"
        disabled={!canEdit}
        onClick={() => handleDeleteRequest(request.id)}
        title="Delete Request"
        color="error"
      >
        <DeleteIcon />
      </IconButton>
    </div>
  );
};

export default function RequestTable({
  lng,
  requests,
  workers,
  shifts,
  shiftOptions,
  userWorkerId,
  userTeamRole,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  showPastRequests,
}: {
  lng: string;
  requests: RequestT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleUpdateRequest: (request: RequestT) => void;
  handleDeleteRequest: (requestId: string) => void;
  handleRescindRequest: (requestId: string) => void;
  showPastRequests: boolean;
}) {
  const { t } = useTranslation(lng, "request-page");

  // Helper function to check if request is in the past
  const isRequestPast = (request: RequestT) => {
    return request.endDate.isBefore(new Date(), "day");
  };

  const handleApproveRequest = (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      const updatedRequest = { ...request, status: RequestStatus.APPROVED };
      handleUpdateRequest(updatedRequest);
    }
  };

  // Simplified column definitions focused on the actual requirements
  const columns: ColumnDefinition[] = useMemo(
    () => [
      {
        id: "workerId",
        label: t("worker"),
        type: "select" as const,
        getValue: (request: RequestT) => request.workerId,
        getDisplayValue: (request: RequestT) => {
          const worker = workers.find((w) => w.id === request.workerId);
          return worker ? worker.name : "Unknown";
        },
        getOptions: () =>
          workers.map((worker) => ({
            value: worker.id,
            label: worker.name,
          })),
      },
      {
        id: "shift",
        label: t("shift"),
        type: "select" as const,
        getValue: (request: RequestT) => {
          if (request.requestType === RequestType.LEAVE) {
            return request.shiftId || "all_day";
          }
          return (
            request.shiftOptions.map((opt) => opt.id).join(",") ||
            "no_preferences"
          );
        },
        getDisplayValue: (request: RequestT) => {
          if (request.requestType === RequestType.LEAVE) {
            if (!request.shiftId) return "All Day";
            const shift = shifts.find((s) => s.id === request.shiftId);
            return shift ? shift.name : "Unknown";
          }
          return request.shiftOptions.length > 0
            ? request.shiftOptions.map((opt) => opt.name).join(", ")
            : "No Preferences";
        },
        getOptions: () => [
          { value: "all_day", label: "All Day" },
          { value: "no_preferences", label: "No Preferences" },
          ...shifts.map((shift) => ({
            value: shift.id,
            label: shift.name,
          })),
        ],
      },
      {
        id: "date",
        label: t("date"),
        type: "date" as const,
        getValue: (request: RequestT) => request.startDate.format("YYYY-MM-DD"),
        getDisplayValue: (request: RequestT) => {
          if (request.startDate.isSame(request.endDate, "day")) {
            return request.startDate.format("MMM D, YYYY");
          }
          return `${request.startDate.format(
            "MMM D"
          )} - ${request.endDate.format("MMM D, YYYY")}`;
        },
      },
      {
        id: "requestType",
        label: t("type"),
        type: "select" as const,
        getValue: (request: RequestT) => request.requestType,
        getDisplayValue: (request: RequestT) =>
          request.requestType === RequestType.WORK_DEMAND ? "Work" : "Leave",
        getOptions: () => [
          { value: RequestType.WORK_DEMAND, label: "Work" },
          { value: RequestType.LEAVE, label: "Leave" },
        ],
      },
      {
        id: "status",
        label: t("status"),
        type: "select" as const,
        getValue: (request: RequestT) => request.status,
        getOptions: () => [
          { value: RequestStatus.PENDING, label: t("pending") },
          { value: RequestStatus.APPROVED, label: t("approved") },
          { value: RequestStatus.DENIED, label: t("rejected") },
          // { value: RequestStatus.DEFERRED, label: t("deferred") },
        ],
      },
      {
        id: "fulfillment",
        label: t("fulfillment"),
        type: "select" as const,
        getValue: (request: RequestT) => request.fulfillment,
        getOptions: () => [
          { value: FulfillmentStatus.NOT_PROCESSED, label: "Not Processed" },
          { value: FulfillmentStatus.FULFILLED, label: "Fulfilled" },
          { value: FulfillmentStatus.UNFULFILLED, label: "Unfulfilled" },
        ],
      },
    ],
    [workers, shifts, t]
  );

  const {
    tableState,
    filteredAndSortedData,
    addFilter,
    removeFilter,
    updateSort,
    resetAll,
  } = useTableState(requests, columns, "nsp-pro-request-table-state");

  return (
    <div className="w-full">
      <TableFilterBar
        filters={tableState.filters}
        sort={tableState.sort}
        onRemoveFilter={removeFilter}
        onRemoveSort={() => updateSort(null)}
        onResetAll={resetAll}
      />

      <TableContainer className="border border-gray-200 rounded-lg">
        <Table size="small" aria-label="requests table">
          <TableHead>
            <TableRow className="bg-gray-50">
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  className="font-medium text-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    <ColumnSortFilterMenu
                      column={column}
                      currentSort={
                        tableState.sort?.columnId === column.id
                          ? tableState.sort
                          : undefined
                      }
                      currentFilter={tableState.filters.find(
                        (f) => f.id === column.id
                      )}
                      onSort={updateSort}
                      onFilter={addFilter}
                    />
                  </div>
                </TableCell>
              ))}
              <TableCell className="font-medium text-gray-700 w-32">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedData.map((request) => {
              const isPast = isRequestPast(request);
              return (
                <TableRow
                  key={request.id}
                  className={`hover:bg-gray-50 ${
                    !request.active ? "opacity-50" : ""
                  } ${
                    isPast && showPastRequests ? "bg-gray-25 opacity-75" : ""
                  }`}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    ...(isPast &&
                      showPastRequests && {
                        "& .MuiTableCell-root": {
                          color: "text.secondary",
                        },
                      }),
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <WorkerCell request={request} workers={workers} />
                      {isPast && showPastRequests && (
                        <Chip
                          label={t("past") || "Past"}
                          size="small"
                          variant="outlined"
                          color="default"
                          className="text-xs opacity-60"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ShiftCell
                      request={request}
                      shifts={shifts}
                      workers={workers}
                      t={t}
                    />
                  </TableCell>
                  <TableCell>
                    <DateCell request={request} />
                  </TableCell>
                  <TableCell>
                    <TypeCell request={request} />
                  </TableCell>
                  <TableCell>
                    <StatusCell request={request} t={t} />
                  </TableCell>
                  <TableCell>
                    <FulfillmentCell request={request} />
                  </TableCell>
                  <TableCell>
                    <ActionsCell
                      request={request}
                      lng={lng}
                      workers={workers}
                      shifts={shifts}
                      shiftOptions={shiftOptions}
                      userWorkerId={userWorkerId}
                      userTeamRole={userTeamRole}
                      handleUpdateRequest={handleUpdateRequest}
                      handleDeleteRequest={handleDeleteRequest}
                      handleRescindRequest={handleRescindRequest}
                      handleApproveRequest={handleApproveRequest}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
