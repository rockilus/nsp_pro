import React from "react";
// MUI
import AddCircleIcon from "@mui/icons-material/AddCircle";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
// Components
import AssignmentCell from "../shared/assignment-cell";
import RequestCell from "../shared/request-cell";
// Styles
import "./worker-cell.css";
// Types
import { WorkerT } from "../../../../types/worker";
import { ShiftT } from "../../../../types/shift";
import {
  periodDateT,
  ScheduleViewSettingsT,
  ScheduleCellDataT,
} from "../../../../types/schedule";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentDataDictT } from "@/types/assignment";
import { RequestT } from "../../../../types/request";

export default function WorkerCell({
  periodDate,
  worker,
  shifts,
  scheduleCellData,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleRequestSelection,
  handleOpenCreateAssignment,
}: {
  periodDate: periodDateT;
  worker: WorkerT;
  shifts: ShiftT[];
  scheduleCellData: ScheduleCellDataT | null;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (seletedCell: AssignmentDataDictT) => void;
  handleRequestSelection?: (request: RequestT) => void;
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
      {scheduleViewSettings.showRequests &&
        scheduleCellData?.requests.map((request) => {
          return (
            <RequestCell
              key={request.id}
              request={request}
              shifts={shifts}
              handleRequestSelection={handleRequestSelection}
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
