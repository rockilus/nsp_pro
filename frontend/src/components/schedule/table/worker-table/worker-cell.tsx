import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import { generateOwnerIdDateKey } from "./assignment-utils";
// Styles
import "./worker-cell.css";
// Types
import { ShiftT, ShiftType, ShiftRestType } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  ScheduleT,
  ScheduleStatus,
  AssignmentDictT,
  AssignmentDataDictT,
} from "../../../../types/schedule";
import { RequestStatus } from "../../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function WorkerCell({
  periodDate,
  scheduleCampaign,
  worker,
  shifts,
  workerIdDateToAssignData,
  showBreaches,
  handleCellSelection,
}: {
  periodDate: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null };
  scheduleCampaign: ScheduleT | null;
  worker: WorkerT;
  shifts: ShiftT[];
  workerIdDateToAssignData: AssignmentDictT;
  showBreaches: boolean;
  handleCellSelection: (seletedCell: AssignmentDataDictT) => void;
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
          showBreaches && breachHard
            ? "hard-breach"
            : showBreaches && breachSoft
            ? "soft-breach"
            : ""
        }`}
        onClick={() => handleCellSelection(aDataDict)}
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
      sx={{
        align: "center",
        borderRight: "1px solid #e0e0e07d",
        padding: 0,
      }}
    >
      <CellContent />
    </TableCell>
  );
}
