import React from "react";
// Styles
import "./daily-shift-demand-cell.css";
// Types
import { ScheduleCellDataT } from "../../../../types/schedule";
// Constants
import { TrafficLightColorMappings } from "../../../../constants/constants";

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

  const { background, text } =
    countActual === countTarget
      ? TrafficLightColorMappings.green
      : TrafficLightColorMappings.red;

  return (
    <div
      className="dsd-cell-container"
      onClick={() => handleDemandSelection(scheduleCellData)}
      style={{
        "--bg-color": background,
        "--text-color": text,
      } as React.CSSProperties}
    >
      <div className="dsd-cell-stats">
        <span className="dsd-stats dsd-stats-actual">{countActual}</span>
        <span className="dsd-stats dsd-stats-slash">/</span>
        <span className="dsd-stats dsd-stats-target">{countTarget}</span>
      </div>
    </div>
  );
}
