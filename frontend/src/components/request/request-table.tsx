import React, { useMemo } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Components
import RequestTableRow from "./request-table-row";
import TableColumnHeader from "../table/TableColumnHeader";
import TableFilterBar from "../table/TableFilterBar";
// Hooks
import { useTableState } from "../../hooks/useTableState";
// Styles
import "../../styles/table-styles.css";
// Types
import { WorkerT } from "../../types/worker";
import { RequestT, RequestStatus } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { TeamMembershipRole } from "@/types/team";
import { ShiftWorkerOptionT } from "@/types/constraint";
import { ColumnDefinition } from "../../types/filter";

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
}) {
  const { t } = useTranslation(lng, "request-page");

  // Define columns with filter/sort configurations
  const columns: ColumnDefinition[] = useMemo(
    () => [
      {
        id: "negative",
        label: "",
        type: "select" as const,
        getValue: (request: RequestT) => request.negative,
        getDisplayValue: (request: RequestT) =>
          request.negative ? "Negative" : "Positive",
        getOptions: () => [
          { value: true, label: "Negative" },
          { value: false, label: "Positive" },
        ],
      },
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
        id: "shiftId",
        label: t("shift"),
        type: "select" as const,
        getValue: (request: RequestT) => request.shiftId || "none",
        getDisplayValue: (request: RequestT) => {
          if (!request.shiftId) return "Shift Options";
          const shift = shifts.find((s) => s.id === request.shiftId);
          return shift ? shift.name : "Unknown";
        },
        getOptions: () => [
          { value: "none", label: "Shift Options" },
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
            return request.startDate.format("dddd, MMM D");
          } else {
            return `${request.startDate.format(
              "dddd, MMM D"
            )} - ${request.endDate.format("dddd, MMM D")}`;
          }
        },
      },
      {
        id: "hard",
        label: t("type"),
        type: "select" as const,
        getValue: (request: RequestT) => request.hard,
        getDisplayValue: (request: RequestT) =>
          request.hard ? "Hard" : "Soft",
        getOptions: () => [
          { value: true, label: "Hard" },
          { value: false, label: "Soft" },
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
  } = useTableState(requests, columns);

  // Convert columns back to requestTableFields format for RequestTableRow compatibility
  const requestTableFields: Record<string, string>[] = columns.map((col) => ({
    name: col.id,
    label: col.label,
  }));

  return (
    <>
      <TableFilterBar
        filters={tableState.filters}
        sort={tableState.sort}
        onRemoveFilter={removeFilter}
        onRemoveSort={() => updateSort(null)}
        onResetAll={resetAll}
      />

      <TableContainer>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableColumnHeader
                  key={column.id}
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
              ))}
              <TableCell sx={{ padding: 0, width: 110 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedData.map((request, requestIndex) => (
              <RequestTableRow
                key={requestIndex}
                lng={lng}
                request={request}
                workers={workers}
                shifts={shifts}
                shiftOptions={shiftOptions}
                requestTableFields={requestTableFields}
                userWorkerId={userWorkerId}
                userTeamRole={userTeamRole}
                handleUpdateRequest={handleUpdateRequest}
                handleDeleteRequest={handleDeleteRequest}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
