import React, { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
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
  ScheduleViewSettingsT,
} from "../../../types/schedule";

export default function ScheduleNavBar({
  lng,
  currentPeriodStart,
  currentPeriodEnd,
  scheduleCampaign,
  solveStatus,
  scheduleViewSettings,
  handleToday,
  handlePreviousPeriod,
  handleNextPeriod,
  handleSolveSchedule,
  handleValidateSchedule,
  handleSendDuplicateRequest,
  updateScheduleViewSettings,
  handleChangeTimeFrame,
}: {
  lng: string;
  currentPeriodStart: dayjs.Dayjs;
  currentPeriodEnd: dayjs.Dayjs;
  scheduleCampaign: ScheduleT | null;
  solveStatus: SolveDetailsStatus | null | "error";
  scheduleViewSettings: ScheduleViewSettingsT;
  handleToday: () => void;
  handlePreviousPeriod: () => void;
  handleNextPeriod: () => void;
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
  handleSendDuplicateRequest: (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string
  ) => void;
  updateScheduleViewSettings: (newSettings: ScheduleViewSettingsT) => void;
  handleChangeTimeFrame: (newTimeFrame: "week" | "month") => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

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
        scheduleViewSettings={scheduleViewSettings}
        handleToday={handleToday}
        handlePreviousPeriod={handlePreviousPeriod}
        handleNextPeriod={handleNextPeriod}
        handleChangeTimeFrame={handleChangeTimeFrame}
      />
      <DataViewSelector
        lng={lng}
        scheduleViewSettings={scheduleViewSettings}
        updateScheduleViewSettings={updateScheduleViewSettings}
      />
      <ScheduleSettings
        lng={lng}
        campaign={scheduleCampaign}
        startDate={currentPeriodStart}
        endDate={currentPeriodEnd}
        scheduleViewSettings={scheduleViewSettings}
        handleSendDuplicateRequest={handleSendDuplicateRequest}
        updateScheduleViewSettings={updateScheduleViewSettings}
        handleChangeTimeFrame={handleChangeTimeFrame}
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
              {t("create_campaign")}
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
