import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import AddCircleIcon from "@mui/icons-material/AddCircle";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
// Components
import { generateOwnerIdDateKey } from "../shared/assignment-utils";
// Styles
import "./worker-cell.css";
// Types
import { ShiftT, ShiftType, ShiftRestType } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  ScheduleT,
  periodDateT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentDictT } from "@/types/assignment";
import { AssignmentDataDictT } from "@/types/assignment";
import { RequestStatus } from "../../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function WorkerCell({
  periodDate,
  scheduleCampaign,
  worker,
  shifts,
  workerIdDateToAssignData,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleOpenCreateAssignment,
}: {
  periodDate: periodDateT;
  scheduleCampaign: ScheduleT | null;
  worker: WorkerT;
  shifts: ShiftT[];
  workerIdDateToAssignData: AssignmentDictT;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (seletedCell: AssignmentDataDictT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  const AssignmentDiv = ({
    aDataDict,
    isLastAssignment,
  }: {
    aDataDict: AssignmentDataDictT;
    isLastAssignment: boolean;
  }) => {
    const assignmentFixed =
      scheduleCampaign &&
      aDataDict.assignment.scheduleId === scheduleCampaign.id &&
      aDataDict.assignment.fixed;
    const breachHard =
      aDataDict.breaches.some((b) => b.hardToSoft) ||
      aDataDict.requests.some(
        (r) => r.hard && r.status === RequestStatus.REJECTED && r.active
      );
    const breachSoft =
      !breachHard &&
      (aDataDict.breaches.some((b) => !b.hardToSoft) ||
        aDataDict.requests.some(
          (r) => !r.hard && r.status === RequestStatus.REJECTED && r.active
        ));

    let shiftNameDisplayed = aDataDict.shift.acronym;
    if (aDataDict.shift.restType === ShiftRestType.RECUPERATION) {
      const shiftDuty = shifts.find(
        (s) => s.id === aDataDict.shift.recuperationDutyId
      );
      if (shiftDuty) {
        shiftNameDisplayed = `RC-${shiftDuty.acronym}`;
      }
    }

    return (
      <div
        className={`assignment-div-container ${
          isLastAssignment ? "last" : ""
        } ${
          scheduleViewSettings.showBreaches && breachHard
            ? "hard-breach"
            : scheduleViewSettings.showBreaches && breachSoft
            ? "soft-breach"
            : ""
        }`}
        onClick={() => handleAssignmentSelection(aDataDict)}
      >
        <span className={`shift-name-cell ${assignmentFixed ? "fix" : ""}`}>
          {shiftNameDisplayed}
        </span>
        <div className="shift-times-container">
          <span className="shift-times-cell">
            {aDataDict.shift.startTime.format("HH:mm")}
          </span>
          <span className="shift-times-cell">{" - "}</span>
          <span className="shift-times-cell">
            {aDataDict.shift.endTime.format("HH:mm")}
            {!aDataDict.shift.endTime.isSame(
              aDataDict.shift.startTime,
              "day"
            ) && <sup>+1</sup>}
          </span>
        </div>
        <div
          className={`w-shift-type-marker ${
            aDataDict.shift.shiftType === ShiftType.DUTY ? "duty" : "other"
          }`}
        ></div>
      </div>
    );
  };

  const CellContent = ({}) => {
    const workerDateKey = generateOwnerIdDateKey(worker.id, periodDate.date);
    const aDataDicts: AssignmentDataDictT[] =
      workerIdDateToAssignData[workerDateKey] || [];

    return (
      <div className="cell-content-container">
        {aDataDicts.map((aDataDict, addIndex) => {
          return (
            <AssignmentDiv
              key={addIndex}
              aDataDict={aDataDict}
              isLastAssignment={addIndex === aDataDicts.length - 1}
            />
          );
        })}
      </div>
    );
  };

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
      <CellContent />
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
