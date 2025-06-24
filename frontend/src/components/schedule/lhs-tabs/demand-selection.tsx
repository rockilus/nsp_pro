import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Styles
import "./demand-selection.css";
// Types
import { ScheduleT, ScheduleCellDataT } from "../../../types/schedule";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "@/types/recurrence";
import { SpecialtyT } from "@/types/specialty";
import { DSDSourceType, DailyShiftDemandT } from "@/types/daily-shift-demand";

// TODO: This component still uses legacy ScheduleCellDataT and DailyShiftDemandT types
// It needs a full refactor to work with the new ShiftDemandDTO approach
// The selectedDemand prop structure and all handlers need to be updated

export default function DemandSelection({
  lng,
  teamId,
  campaign,
  selectedDemand,
  specialties,
  handleCreateDSD,
  handleUpdateDSD,
  handleDeleteDSDs,
}: {
  lng: string;
  teamId: string;
  campaign: ScheduleT | null;
  selectedDemand: ScheduleCellDataT;
  specialties: SpecialtyT[];
  handleCreateDSD: (dsd: DailyShiftDemandT) => Promise<void>; // Legacy signature - needs refactor
  handleUpdateDSD: (dsd: DailyShiftDemandT) => Promise<void>; // Legacy signature - needs refactor
  handleDeleteDSDs: (
    teamId: string,
    shiftId: string,
    date: dayjs.Dayjs
  ) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const date =
    selectedDemand.dailyShiftDemandsData?.dailyShiftDemands[0].date || null;

  const assignmentsCount = selectedDemand.assignmentsData.length;
  const shiftStaffingTotal =
    selectedDemand.dailyShiftDemandsData?.shift.staffing.reduce(
      (sum, staffing) => sum + staffing.staffing,
      0
    ) || 0;

  const countActual = Math.floor(assignmentsCount / shiftStaffingTotal);
  const countTarget =
    selectedDemand.dailyShiftDemandsData?.dailyShiftDemands.reduce(
      (sum, demand) => sum + demand.count,
      0
    ) || 0;

  const handleDecreaseDSD = () => {
    if (
      !date ||
      !campaign ||
      !selectedDemand.dailyShiftDemandsData ||
      !selectedDemand.dailyShiftDemandsData.dailyShiftDemands
    ) {
      return;
    }

    if (
      dayjs(date).isBefore(dayjs(campaign.startDate)) ||
      dayjs(date).isAfter(dayjs(campaign.endDate))
    ) {
      return;
    }

    const dsdShiftDemand =
      selectedDemand.dailyShiftDemandsData.dailyShiftDemands.find(
        (dsd) => dsd.sourceType === DSDSourceType.SHIFT_DEMAND && dsd.count > 0
      );
    const dsdDirectReq =
      selectedDemand.dailyShiftDemandsData.dailyShiftDemands.find(
        (dsd) => dsd.sourceType === DSDSourceType.DIRECT_REQUIREMENT
      );
    const dsdIsGreaterThanZero =
      (dsdShiftDemand ? dsdShiftDemand.count : 0) +
        (dsdDirectReq ? dsdDirectReq.count : 0) >
      0;
    if (!dsdIsGreaterThanZero) {
      return;
    }
    if (dsdDirectReq) {
      handleUpdateDSD({
        ...dsdDirectReq,
        count: dsdDirectReq.count - 1,
      });
    } else {
      const newDsd: DailyShiftDemandT = {
        id: "",
        teamId: teamId,
        scheduleId: campaign.id,
        shiftDemandId: null,
        coverageSelectorId: null,
        sourceType: DSDSourceType.DIRECT_REQUIREMENT,
        date: date,
        shiftId: selectedDemand.dailyShiftDemandsData.shift.id,
        count: -1,
      };
      handleCreateDSD(newDsd);
    }
  };

  const handleIncreaseDSD = () => {
    if (
      !date ||
      !campaign ||
      !selectedDemand.dailyShiftDemandsData ||
      !selectedDemand.dailyShiftDemandsData.dailyShiftDemands
    ) {
      return;
    }

    if (
      dayjs(date).isBefore(dayjs(campaign.startDate)) ||
      dayjs(date).isAfter(dayjs(campaign.endDate))
    ) {
      return;
    }
    const dsdDirectReq =
      selectedDemand.dailyShiftDemandsData.dailyShiftDemands.find(
        (dsd) => dsd.sourceType === DSDSourceType.DIRECT_REQUIREMENT
      );
    if (dsdDirectReq) {
      handleUpdateDSD({
        ...dsdDirectReq,
        count: dsdDirectReq.count + 1,
      });
    } else {
      const newDsd: DailyShiftDemandT = {
        id: "",
        teamId: teamId,
        scheduleId: campaign.id,
        shiftDemandId: null,
        coverageSelectorId: null,
        sourceType: DSDSourceType.DIRECT_REQUIREMENT,
        date: date,
        shiftId: selectedDemand.dailyShiftDemandsData.shift.id,
        count: 1,
      };
      handleCreateDSD(newDsd);
    }
  };

  const handleDeleteDemands = () => {
    if (
      !date ||
      !selectedDemand.dailyShiftDemandsData ||
      !selectedDemand.dailyShiftDemandsData.dailyShiftDemands
    ) {
      return;
    }
    handleDeleteDSDs(
      teamId,
      selectedDemand.dailyShiftDemandsData.shift.id,
      date
    );
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
      {selectedDemand.dailyShiftDemandsData &&
        selectedDemand.dailyShiftDemandsData.dailyShiftDemands && (
          <div className="demand-selection-content">
            <div className="demand-selection-first-row">
              <span className="demand-selection-shift-name">
                {selectedDemand.dailyShiftDemandsData.shift.name}
              </span>
              <div className="demand-selection-shift-status">
                <span className="dsd-stats dsd-stats-actual">{`${countActual} / ${countTarget}`}</span>
              </div>
            </div>
            <span className="demand-selection-date-time">
              {selectedDemand.dailyShiftDemandsData.dailyShiftDemands[0].date.format(
                "D MMMM YYYY"
              )}
              {" ⋅ "}
              {selectedDemand.dailyShiftDemandsData.shift.startTime.format(
                "HH:mm"
              )}
              {" - "}
              {selectedDemand.dailyShiftDemandsData.shift.endTime.format(
                "HH:mm"
              )}
              {!selectedDemand.dailyShiftDemandsData.shift.endTime.isSame(
                selectedDemand.dailyShiftDemandsData.shift.startTime,
                "day"
              ) && <sup>+1</sup>}
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
              {selectedDemand.dailyShiftDemandsData.shift.staffing.map(
                (staffing, index) => (
                  <div
                    key={`${staffing.specialtyId}-${index}`}
                    className="demand-selection-staffing-required-item"
                  >
                    <span className="demand-selection-staffing-required-name">
                      {staffing.specialtyId
                        ? specialties.find((s) => s.id == staffing.specialtyId)
                            ?.name
                        : t("any")}
                    </span>
                    <span className="demand-selection-staffing-required-count-per-shift">
                      {`(${staffing.staffing})`}
                    </span>
                    <span className="demand-selection-staffing-required-count">
                      {staffing.staffing * countTarget}
                    </span>
                  </div>
                )
              )}
              <div className="demand-selection-sum-line" />
              <div className="demand-selection-staffing-required-item">
                <span className="demand-selection-staffing-required-name">
                  {t("total")}
                </span>
                <span className="demand-selection-staffing-required-count-per-shift"></span>
                <span className="demand-selection-staffing-required-count">
                  {selectedDemand.dailyShiftDemandsData.shift.staffing.reduce(
                    (sum, staffing) => sum + staffing.staffing,
                    0
                  ) * countTarget}
                </span>
              </div>
            </div>
          </div>
        )}
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
