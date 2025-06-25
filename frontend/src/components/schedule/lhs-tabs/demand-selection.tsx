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
  shift: ShiftT;
  date: dayjs.Dayjs;
  shiftDemand: ShiftDemandDTO;
  assignments: AssignmentT[];
  specialties: SpecialtyT[];
  handleUpdateShiftDemand: (
    demandId: string,
    updates: Partial<ShiftDemandUpdateDTO>
  ) => Promise<void>;
  handleDeleteShiftDemand: (demandId: string) => Promise<void>;
}

export default function DemandSelection({
  lng,
  shift,
  date,
  shiftDemand,
  assignments,
  specialties,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: DemandSelectionProps) {
  const { t } = useTranslation(lng, "schedule-page");

  // Calculate counts based on new data structure
  const assignmentsCount = assignments.length;
  const shiftStaffingTotal = shift.staffing.reduce(
    (sum: number, staffing) => sum + staffing.staffing,
    0
  );

  const countActual = Math.floor(assignmentsCount / shiftStaffingTotal);

  const handleDecreaseDSD = async () => {
    if (shiftDemand.count <= 1) {
      return;
    }

    await handleUpdateShiftDemand(shiftDemand.id, {
      count: shiftDemand.count - 1,
    });
  };

  const handleIncreaseDSD = async () => {
    await handleUpdateShiftDemand(shiftDemand.id, {
      count: shiftDemand.count + 1,
    });
  };

  const handleDeleteDemands = async () => {
    await handleDeleteShiftDemand(shiftDemand.id);
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
            <span className="dsd-stats dsd-stats-actual">{`${countActual} / ${shiftDemand.count}`}</span>
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
          <span className="demand-selection-dsd-target">
            {shiftDemand.count}
          </span>
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
                {staffing.staffing * shiftDemand.count}
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
              ) * shiftDemand.count}
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
