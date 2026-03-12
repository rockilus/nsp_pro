"use client";
import React from "react";
import { Sparkle } from "lucide-react";
// Styles
import "./daily-shift-demand-cell.css";
// Types
import {
  ScheduleCellDataT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
// Constants
import { TrafficLightColorMappings } from "../../../../constants/constants";
import { useTranslation } from "../../../../app/i18n/client";
import Tooltip from "@mui/material/Tooltip";

export default function DailyShiftDemandCell({
  scheduleCellData,
  handleDemandSelection,
  scheduleViewSettings,
  lng,
  isCustomSolveModeActive = false,
  isCustomCellSelected = false,
  onCustomCellSelect,
  isDateInCampaign = true,
}: {
  scheduleCellData: ScheduleCellDataT;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  scheduleViewSettings: ScheduleViewSettingsT;
  lng: string;
  isCustomSolveModeActive?: boolean;
  isCustomCellSelected?: boolean;
  onCustomCellSelect?: () => void;
  isDateInCampaign?: boolean;
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

  const { t } = useTranslation(lng, "schedule-page");
  const tooltipText =
    scheduleViewSettings.groupBy === "shift"
      ? t("dsd.tooltip.shift")
      : t("dsd.tooltip.worker");

  return (
    <Tooltip title={tooltipText} arrow>
      <div
        className="dsd-cell-container"
        data-testid={`demand-cell-${scheduleCellData.shiftDemandsData?.shiftDemand?.id}`}
        onClick={() => handleDemandSelection(scheduleCellData)}
        aria-label={tooltipText}
        style={
          {
            "--bg-color": background,
            "--text-color": text,
            position: "relative",
          } as React.CSSProperties
        }
      >
        <div className="dsd-cell-stats">
          <span className="dsd-stats dsd-stats-actual">{countActual}</span>
          <span className="dsd-stats dsd-stats-slash">/</span>
          <span className="dsd-stats dsd-stats-target">{countTarget}</span>
        </div>
        {isCustomSolveModeActive && isDateInCampaign && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCustomCellSelect?.();
            }}
            data-testid={`dsd-custom-select-${scheduleCellData.shiftDemandsData?.shiftDemand?.id}`}
            style={{
              position: "absolute",
              top: 1,
              right: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              color: isCustomCellSelected ? "#1976d2" : "#9e9e9e",
            }}
          >
            <Sparkle
              size={10}
              fill={isCustomCellSelected ? "currentColor" : "none"}
            />
          </button>
        )}
      </div>
    </Tooltip>
  );
}
