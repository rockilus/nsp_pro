import React, { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
// Components
import DataViewSelector from "./data-view-selector";
import TimeViewSelector from "./time-view-selector";
import CampaignInfo from "./campaign-info";
// Types
import { ScheduleT } from "../../../types/schedule";

export default function ScheduleNavBar({
  lng,
  currentPeriodStart,
  currentPeriodEnd,
  selectedTimeView,
  selectedDisplay,
  showBreaches,
  schedule,
  handleNextPeriod,
  handlePreviousPeriod,
  handleChangeSelectedTimeView,
  setSelectedDisplay,
  switchShowBreaches,
  handleSolveSchedule,
  handleValidateSchedule,
}: {
  lng: string;
  currentPeriodStart: dayjs.Dayjs;
  currentPeriodEnd: dayjs.Dayjs;
  selectedTimeView: string;
  selectedDisplay: string;
  showBreaches: boolean;
  schedule: ScheduleT | null;
  handleNextPeriod: () => void;
  handlePreviousPeriod: () => void;
  handleChangeSelectedTimeView: (newSelectedTimeView: string) => void;
  setSelectedDisplay: (newSelectedDisplay: string) => void;
  switchShowBreaches: () => void;
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
}) {
  const [isHoveredCreateCampaign, setIsHoveredCreateCampaign] =
    useState<boolean>(false);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        padding: "3px 16px",
      }}
    >
      <TimeViewSelector
        currentPeriodStart={currentPeriodStart}
        currentPeriodEnd={currentPeriodEnd}
        selectedTimeView={selectedTimeView}
        handleNextPeriod={handleNextPeriod}
        handlePreviousPeriod={handlePreviousPeriod}
        handleChangeSelectedTimeView={handleChangeSelectedTimeView}
      />
      <DataViewSelector
        lng={lng}
        selectedDisplay={selectedDisplay}
        showBreaches={showBreaches}
        setSelectedDisplay={setSelectedDisplay}
        switchShowBreaches={switchShowBreaches}
      />
      {schedule ? (
        <CampaignInfo
          lng={lng}
          schedule={schedule}
          handleSolveSchedule={handleSolveSchedule}
          handleValidateSchedule={handleValidateSchedule}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "470px",
          }}
        >
          <Link href={`/${lng}/plan/campaign`}>
            <button
              style={{
                borderRadius: "4px",
                border: "1px solid #e5e7eb",
                height: "35px",
                padding: "0 15px",
                fontSize: "0.9rem",
                fontWeight: 550,
                color: "#616161",
                backgroundColor: isHoveredCreateCampaign ? "#f0f0f0" : "white",
              }}
              onMouseEnter={() => setIsHoveredCreateCampaign(true)}
              onMouseLeave={() => setIsHoveredCreateCampaign(false)}
            >
              Create campaign to start solving
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
