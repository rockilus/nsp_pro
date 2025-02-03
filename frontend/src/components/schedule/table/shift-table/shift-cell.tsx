import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import { generateOwnerIdDateKey } from "../shared/assignment-utils";
// Styles
import "./shift-cell.css";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  BreachT,
  AssignmentDataDictT,
  ScheduleT,
  ScheduleStatus,
  AssignmentDictT,
} from "../../../../types/schedule";
import { RequestT, RequestStatus } from "../../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function ShiftCell({
  periodDate,
  scheduleCampaign,
  shift,
  shiftIdDateToAssignData,
  showBreaches,
  handleCellSelection,
}: {
  periodDate: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null };
  scheduleCampaign: ScheduleT | null;
  shift: ShiftT;
  shiftIdDateToAssignData: AssignmentDictT;
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
        <span className={`worker-name-cell ${assignmentFixed ? "fix" : ""}`}>
          {aDataDict.worker.acronym}
        </span>
      </div>
    );
  };

  const CellContent = ({}) => {
    const shiftDateKey = generateOwnerIdDateKey(shift.id, periodDate.date);
    const aDataDicts: AssignmentDataDictT[] =
      shiftIdDateToAssignData[shiftDateKey] || [];

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
