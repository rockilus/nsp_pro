import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// Styles
import "./daily-shift-demand-cell.css";
// Types
import {
  AssignmentDataT,
  DailyShiftDemandsDataT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function DailyShiftDemandCell({
  dailyShiftDemandsData,
  countActual,
  scheduleViewSettings,
  handleCellSelection,
}: {
  dailyShiftDemandsData: DailyShiftDemandsDataT;
  countActual: number;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleCellSelection: (seletedCell: AssignmentDataT) => void;
}) {
  const countTarget = dailyShiftDemandsData.dailyShiftDemands.reduce(
    (sum, demand) => sum + demand.count,
    0
  );

  return (
    <div
      className="dsd-cell-container"
      //   onClick={() => handleCellSelection(assignmentData)}
    >
      <div className="dsd-cell-stats">
        <span className="dsd-stats dsd-stats-actual">{countActual}</span>
        <span className="dsd-stats dsd-stats-slash">/</span>
        <span className="dsd-stats dsd-stats-target">{countTarget}</span>
      </div>
    </div>
  );
}
