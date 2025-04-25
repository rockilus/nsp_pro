import React from "react";
// Styles
import "./daily-shift-demand-cell.css";
// Types
import { ScheduleCellDataT } from "../../../../types/schedule";

export default function DailyShiftDemandCell({
  scheduleCellData,
  handleDemandSelection,
}: {
  scheduleCellData: ScheduleCellDataT;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
}) {
  const countActual = scheduleCellData.assignmentsData.length;
  const countTarget =
    scheduleCellData.dailyShiftDemandsData?.dailyShiftDemands.reduce(
      (sum, demand) => sum + demand.count,
      0
    ) || 0;

  return (
    <div
      className="dsd-cell-container"
      onClick={() => handleDemandSelection(scheduleCellData)}
    >
      <div className="dsd-cell-stats">
        <span className="dsd-stats dsd-stats-actual">{countActual}</span>
        <span className="dsd-stats dsd-stats-slash">/</span>
        <span className="dsd-stats dsd-stats-target">{countTarget}</span>
      </div>
    </div>
  );
}
