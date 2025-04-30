import React from "react";
// MUI
import AddCircleIcon from "@mui/icons-material/AddCircle";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
// Components
import AssignmentCell from "../shared/assignment-cell";
// Styles
import "./worker-cell.css";
// Types
import { WorkerT } from "../../../../types/worker";
import {
  periodDateT,
  ScheduleViewSettingsT,
  ScheduleCellDataT,
} from "../../../../types/schedule";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentDataDictT } from "@/types/assignment";

export default function WorkerCell({
  periodDate,
  worker,
  scheduleCellData,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleOpenCreateAssignment,
}: {
  periodDate: periodDateT;
  worker: WorkerT;
  scheduleCellData: ScheduleCellDataT | null;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (seletedCell: AssignmentDataDictT) => void;
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
            workerId: worker.id,
            shiftId: null,
            date: periodDate.date,
            haveDemand: false,
          })
        }
      >
        <AddCircleIcon />
      </IconButton>
    </TableCell>
  );
}
