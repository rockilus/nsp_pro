import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Styles
import "./demand-selection.css";
// Types
import { ShiftT } from "../../../types/shift";
import { SpecialtyT } from "@/types/specialty";
import { ShiftDemandDTO, ShiftDemandUpdateDTO } from "@/types/shiftDemand";
import { AssignmentT } from "@/types/assignment";

interface DemandSelectionProps {
  lng: string;
  teamId: string;
  shift: ShiftT;
  date: dayjs.Dayjs;
  shiftDemands: ShiftDemandDTO[];
  assignments: AssignmentT[];
  specialties: SpecialtyT[];
  campaignStartDate: dayjs.Dayjs;
  campaignEndDate: dayjs.Dayjs;
  handleCreateShiftDemand: (
    shiftId: string,
    date: dayjs.Dayjs,
    count: number,
    notes?: string
  ) => Promise<void>;
  handleUpdateShiftDemand: (
    demandId: string,
    updates: Partial<ShiftDemandUpdateDTO>
  ) => Promise<void>;
  handleDeleteShiftDemands: (
    shiftId: string,
    date: dayjs.Dayjs
  ) => Promise<void>;
}

export default function DemandSelection({
  lng,
  teamId,
  shift,
  date,
  shiftDemands,
  assignments,
  specialties,
  campaignStartDate,
  campaignEndDate,
  handleCreateShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemands,
}: DemandSelectionProps) {
  const { t } = useTranslation(lng, "schedule-page");

  // Calculate counts based on new data structure
  const assignmentsCount = assignments.length;
  const shiftStaffingTotal = shift.staffing.reduce(
    (sum: number, staffing) => sum + staffing.staffing,
    0
  );

  const countActual = Math.floor(assignmentsCount / shiftStaffingTotal);
  const countTarget = shiftDemands.reduce(
    (sum: number, demand) => sum + demand.count,
    0
  );

  // Find manual shift demands (equivalent to legacy DIRECT_REQUIREMENT)
  const manualDemand = shiftDemands.find(
    (demand) => demand.source === "manual" && demand.count > 0
  );

  const handleDecreaseDSD = async () => {
    if (countTarget <= 0) {
      return;
    }

    // Update existing manual demand
    await handleUpdateShiftDemand(manualDemand.id, {
      count: Math.max(0, manualDemand.count - 1),
    });
  };

  const handleIncreaseDSD = async () => {
    if (date.isBefore(campaignStartDate) || date.isAfter(campaignEndDate)) {
      return;
    }

    if (manualDemand) {
      // Update existing manual demand
      await handleUpdateShiftDemand(manualDemand.id, {
        count: manualDemand.count + 1,
      });
    } else {
      // Create new manual demand
      await handleCreateShiftDemand(shift.id, date, 1, "Direct requirement");
    }
  };

  const handleDeleteDemands = async () => {
    await handleDeleteShiftDemands(shift.id, date);
  };

  const AdjustStaffingButtons = () => {
    return (
      <div className="demand-selection-adjust-buttons-container">
        <button
          className="demand-selection-adjust-button adjust-button-left"
          onClick={handleDecreaseDSD}
        >
          –
        </button>
        <button
          className="demand-selection-adjust-button adjust-button-right"
          onClick={handleIncreaseDSD}
        >
          +
        </button>
      </div>
    );
  };

  return (
    <div className="demand-selection-container">
      {/* <span className="demand-selection-title">{t("demand")}</span> */}
      <div className="demand-selection-content">
        <div className="demand-selection-first-row">
          <span className="demand-selection-shift-name">{shift.name}</span>
          <div className="demand-selection-shift-status">
            <span className="dsd-stats dsd-stats-actual">{`${countActual} / ${countTarget}`}</span>
          </div>
        </div>
        <span className="demand-selection-date-time">
          {date.format("D MMMM YYYY")}
          {" ⋅ "}
          {shift.startTime.format("HH:mm")}
          {" - "}
          {shift.endTime.format("HH:mm")}
          {!shift.endTime.isSame(shift.startTime, "day") && <sup>+1</sup>}
        </span>
        <div className="demand-selection-daily-shift-demand">
          <span className="demand-selection-dsd-label">{t("demand")}</span>
          <span className="demand-selection-dsd-target">{countTarget}</span>
          <AdjustStaffingButtons />
        </div>
        <div className="demand-selection-staffing-required">
          <span className="demand-selection-staffing-required-label">
            {t("staffing_required")}
          </span>
          {shift.staffing.map((staffing, index) => (
            <div
              key={`${staffing.specialtyId}-${index}`}
              className="demand-selection-staffing-required-item"
            >
              <span className="demand-selection-staffing-required-name">
                {staffing.specialtyId
                  ? specialties.find((s) => s.id == staffing.specialtyId)?.name
                  : t("any")}
              </span>
              <span className="demand-selection-staffing-required-count-per-shift">
                {`(${staffing.staffing})`}
              </span>
              <span className="demand-selection-staffing-required-count">
                {staffing.staffing * countTarget}
              </span>
            </div>
          ))}
          <div className="demand-selection-sum-line" />
          <div className="demand-selection-staffing-required-item">
            <span className="demand-selection-staffing-required-name">
              {t("total")}
            </span>
            <span className="demand-selection-staffing-required-count-per-shift"></span>
            <span className="demand-selection-staffing-required-count">
              {shift.staffing.reduce(
                (sum: number, staffing) => sum + staffing.staffing,
                0
              ) * countTarget}
            </span>
          </div>
        </div>
      </div>
      <div className="demand-selection-buttons-container">
        <Button
          variant="outlined"
          color="error"
          onClick={handleDeleteDemands}
          className="delete-button"
          sx={{
            textTransform: "none",
          }}
        >
          {t("delete")}
        </Button>
      </div>
    </div>
  );
}
