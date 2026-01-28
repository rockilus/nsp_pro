import React from "react";
// MUI
import AddCircleIcon from "@mui/icons-material/AddCircle";
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

export default function ShiftCell({
  teamWithMembership,
  periodDate,
  shift,
  scheduleCellData,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
  handleOpenCreateAssignment,
}: {
  teamWithMembership: TeamWithMembership;
  periodDate: periodDateT;
  shift: ShiftT;
  scheduleCellData: ScheduleCellDataT | null;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (seletedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  return (
    <TableCell
      className="cell-hover-container"
      sx={{
        align: "center",
        borderRight: "1px solid #e0e0e07d",
        padding: 0,
        position: "relative",
      }}
      data-testid={`shift-cell-${shift.id}-${periodDate.date.format(
        "YYYY-MM-DD",
      )}`}
    >
      {scheduleViewSettings.showAssignments &&
        scheduleCellData?.assignmentsData.map((aData) => {
          return (
            <AssignmentCell
              key={aData.assignment.id}
              assignmentData={aData}
              scheduleViewSettings={scheduleViewSettings}
              handleAssignmentSelection={handleAssignmentSelection}
              teamWithMembership={teamWithMembership}
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
            />
          )}
      </RoleBased>
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
    </TableCell>
  );
}
