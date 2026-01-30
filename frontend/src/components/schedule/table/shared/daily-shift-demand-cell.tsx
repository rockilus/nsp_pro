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
  const assignmentsCount = scheduleCellData.assignmentsData.length;
  const shiftStaffingTotal =
    scheduleCellData.shiftDemandsData?.shift.staffing.reduce(
      (sum, staffing) => sum + staffing.staffing,
      0,
    ) || 0;

  const countActual =
    shiftStaffingTotal > 0
      ? Math.floor(assignmentsCount / shiftStaffingTotal)
      : 0;
  const countTarget =
    scheduleCellData.shiftDemandsData?.shiftDemand?.count || 0;

  const { background, text } =
    countActual === countTarget
      ? TrafficLightColorMappings.green
      : TrafficLightColorMappings.red;

  return (
    <div
      className="dsd-cell-container"
      data-testid={`demand-cell-${scheduleCellData.shiftDemandsData?.shiftDemand?.id}`}
      onClick={() => handleDemandSelection(scheduleCellData)}
      style={
        {
          "--bg-color": background,
          "--text-color": text,
        } as React.CSSProperties
      }
    >
      <div className="dsd-cell-stats">
        <span className="dsd-stats dsd-stats-actual">{countActual}</span>
        <span className="dsd-stats dsd-stats-slash">/</span>
        <span className="dsd-stats dsd-stats-target">{countTarget}</span>
      </div>
    </div>
  );
}
