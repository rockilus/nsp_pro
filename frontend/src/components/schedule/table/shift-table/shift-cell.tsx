import React from "react";
// MUI
import AddCircleIcon from "@mui/icons-material/AddCircle";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
// Components
import AssignmentCell from "../shared/assignment-cell";
import DailyShiftDemandCell from "../shared/daily-shift-demand-cell";
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

export default function ShiftCell({
  periodDate,
  shift,
  scheduleCellData,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
  handleOpenCreateAssignment,
}: {
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
    >
      {scheduleViewSettings.showAssignments &&
        scheduleCellData?.assignmentsData.map((aData) => {
          return (
            <AssignmentCell
              key={aData.assignment.id}
              assignmentData={aData}
              scheduleViewSettings={scheduleViewSettings}
              handleAssignmentSelection={handleAssignmentSelection}
            />
          );
        })}
      {scheduleViewSettings.showDailyShiftDemands &&
        scheduleCellData?.dailyShiftDemandsData && (
          <DailyShiftDemandCell
            scheduleCellData={scheduleCellData}
            handleDemandSelection={handleDemandSelection}
          />
        )}
      <IconButton
        className="add-icon-button"
        sx={{
          position: "absolute",
          bottom: -12, // Adjust spacing from the bottom
          right: "50%",
          transform: "translateX(50%)",
          opacity: 0,
          transition: "opacity 0.3s",
          padding: 0,
          zIndex: 10,
          pointerEvents: "auto",
        }}
        onClick={() =>
          handleOpenCreateAssignment({
            scheduleId: periodDate.scheduleId,
            workerId: null,
            shiftId: shift.id,
            date: periodDate.date,
            haveDemand: scheduleCellData?.dailyShiftDemandsData
              ?.dailyShiftDemands?.length
              ? scheduleCellData?.dailyShiftDemandsData?.dailyShiftDemands
                  ?.length > 0
              : false || false,
          })
        }
      >
        <AddCircleIcon />
      </IconButton>
    </TableCell>
  );
}
