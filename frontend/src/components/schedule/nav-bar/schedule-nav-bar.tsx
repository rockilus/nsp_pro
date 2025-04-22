import React, { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
// Components
import DataViewSelector from "./data-view-selector";
import TimeViewSelector from "./time-view-selector";
import CampaignInfo from "./campaign-info";
import ScheduleSettings from "./schedule-settings";
// Types
import {
  ScheduleT,
  SolveDetailsStatus,
  DuplicateRequestT,
} from "../../../types/schedule";

export default function ScheduleNavBar({
  lng,
  currentPeriodStart,
  currentPeriodEnd,
  selectedTimeView,
  selectedDisplay,
  showBreaches,
  scheduleCampaign,
  solveStatus,
  handleToday,
  handlePreviousPeriod,
  handleNextPeriod,
  handleChangeSelectedTimeView,
  setSelectedDisplay,
  switchShowBreaches,
  handleSolveSchedule,
  handleValidateSchedule,
  handleSendDuplicateRequest,
}: {
  lng: string;
  currentPeriodStart: dayjs.Dayjs;
  currentPeriodEnd: dayjs.Dayjs;
  selectedTimeView: string;
  selectedDisplay: string;
  showBreaches: boolean;
  scheduleCampaign: ScheduleT | null;
  solveStatus: SolveDetailsStatus | null | "error";
  handleToday: () => void;
  handlePreviousPeriod: () => void;
  handleNextPeriod: () => void;
  handleChangeSelectedTimeView: (newSelectedTimeView: string) => void;
  setSelectedDisplay: (newSelectedDisplay: string) => void;
  switchShowBreaches: () => void;
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
  handleSendDuplicateRequest: (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string
  ) => void;
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
        lng={lng}
        currentPeriodStart={currentPeriodStart}
        currentPeriodEnd={currentPeriodEnd}
        selectedTimeView={selectedTimeView}
        handleToday={handleToday}
        handlePreviousPeriod={handlePreviousPeriod}
        handleNextPeriod={handleNextPeriod}
        handleChangeSelectedTimeView={handleChangeSelectedTimeView}
      />
      <DataViewSelector
        lng={lng}
        selectedDisplay={selectedDisplay}
        showBreaches={showBreaches}
        setSelectedDisplay={setSelectedDisplay}
        switchShowBreaches={switchShowBreaches}
      />
      <ScheduleSettings
        campaign={scheduleCampaign}
        startDate={currentPeriodStart}
        endDate={currentPeriodEnd}
        handleSendDuplicateRequest={handleSendDuplicateRequest}
      />
      {scheduleCampaign ? (
        <CampaignInfo
          lng={lng}
          scheduleCampaign={scheduleCampaign}
          solveStatus={solveStatus}
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
              Create campaign
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
