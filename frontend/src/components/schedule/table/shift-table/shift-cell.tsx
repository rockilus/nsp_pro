import React from "react";
// MUI
import AddCircleIcon from "@mui/icons-material/AddCircle";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
// Components
import AssignmentCell from "../shared/assignment-cell";
import DailyShiftDemandCell from "../shared/daily-shift-demand-cell";
import { RoleBased } from "../../../access/role-based";
// Styles
import "./shift-cell.css";
// Types
import { ShiftT } from "../../../../types/shift";
import {
  periodDateT,
  AssignmentDataT,
  ScheduleCellDataT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
import { CreateAssignmentT } from "@/types/assignment";
import { TeamMembershipRole, TeamWithMembership } from "@/types/team";
import { ScheduleSelectionState } from "@/types/scheduleSelection";

export default function ShiftCell({
  lng,
  teamWithMembership,
  periodDate,
  shift,
  scheduleCellData,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
  handleOpenCreateAssignment,
  selectionState,
  handleCellSelect,
  handleAssignmentSelect,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  periodDate: periodDateT;
  shift: ShiftT;
  scheduleCellData: ScheduleCellDataT | null;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (seletedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
  selectionState?: ScheduleSelectionState;
  handleCellSelect?: (
    rowId: string,
    date: string,
    scheduleId: string | null,
  ) => void;
  handleAssignmentSelect?: (assignmentId: string) => void;
}) {
  const isSelectionActive = !!selectionState?.isActive;
  const dateStr = periodDate.date.format("YYYY-MM-DD");
  const isCellSelected =
    selectionState?.selectedCells.some(
      (c) => c.rowId === shift.id && c.date === dateStr,
    ) ?? false;
  const hasAssignments =
    scheduleViewSettings.showAssignments &&
    !!scheduleCellData?.assignmentsData?.length;

  return (
    <TableCell
      className="cell-hover-container"
      sx={{
        align: "center",
        borderRight: "1px solid #e0e0e07d",
        padding: 0,
        position: "relative",
        backgroundColor: isCellSelected
          ? "rgba(25, 118, 210, 0.08)"
          : undefined,
        outline: isCellSelected ? "2px solid #1976d2" : undefined,
        outlineOffset: isCellSelected ? "-2px" : undefined,
      }}
      data-testid={`shift-cell-${shift.id}-${periodDate.date.format(
        "YYYY-MM-DD",
      )}`}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {scheduleViewSettings.showAssignments &&
          scheduleCellData?.assignmentsData.map((aData) => {
            const isAssignmentSelected =
              selectionState?.selectedAssignmentIds.includes(
                aData.assignment.id,
              ) ?? false;
            return (
              <AssignmentCell
                key={aData.assignment.id}
                assignmentData={aData}
                scheduleViewSettings={scheduleViewSettings}
                handleAssignmentSelection={handleAssignmentSelection}
                teamWithMembership={teamWithMembership}
                isSelectionActive={isSelectionActive}
                isSelected={isAssignmentSelected}
                onAssignmentSelect={() =>
                  handleAssignmentSelect?.(aData.assignment.id)
                }
              />
            );
          })}
        <RoleBased
          role={teamWithMembership.membership.role}
          allowedRoles={[TeamMembershipRole.OWNER]}
        >
          {scheduleViewSettings.showDailyShiftDemands &&
            scheduleCellData?.shiftDemandsData && (
              <DailyShiftDemandCell
                scheduleCellData={scheduleCellData}
                handleDemandSelection={handleDemandSelection}
                scheduleViewSettings={scheduleViewSettings}
                lng={lng}
              />
            )}
        </RoleBased>
        {isSelectionActive && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexGrow: hasAssignments ? 0 : 1,
              padding: hasAssignments ? "2px 0" : 0,
            }}
          >
            <Checkbox
              size="small"
              checked={isCellSelected}
              onChange={() =>
                handleCellSelect?.(shift.id, dateStr, periodDate.scheduleId)
              }
              onClick={(e) => e.stopPropagation()}
              data-testid={`shift-cell-checkbox-${shift.id}-${dateStr}`}
              sx={{
                padding: "1px",
                "& .MuiSvgIcon-root": { fontSize: 16 },
              }}
            />
          </div>
        )}
      </div>
      {!isSelectionActive && (
        <RoleBased
          role={teamWithMembership.membership.role}
          allowedRoles={[TeamMembershipRole.OWNER]}
        >
          <IconButton
            className="add-icon-button"
            sx={{
              position: "absolute",
              bottom: -12,
              right: "50%",
              transform: "translateX(50%)",
              opacity: 0,
              transition: "opacity 0.3s",
              padding: 0,
              zIndex: 10,
              pointerEvents: "auto",
            }}
            data-testid={`add-assignment-button-${shift.id}-${periodDate.date.format(
              "YYYY-MM-DD",
            )}`}
            onClick={() =>
              handleOpenCreateAssignment({
                scheduleId: periodDate.scheduleId,
                workerId: null,
                shiftId: shift.id,
                date: periodDate.date,
                haveDemand: !!scheduleCellData?.shiftDemandsData?.shiftDemand,
              })
            }
          >
            <AddCircleIcon />
          </IconButton>
        </RoleBased>
      )}
    </TableCell>
  );
}
