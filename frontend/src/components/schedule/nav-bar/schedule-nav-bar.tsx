import React, { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// Components
import DataViewSelector from "./data-view-selector";
import { TimeNavigation } from "../../common/TimeNavigation";
import CampaignInfo from "./campaign-info";
import ScheduleSettings from "./schedule-settings";
import { RoleBased } from "../../access/role-based";
// Types
import {
  ScheduleT,
  DuplicateRequestT,
  ScheduleViewSettingsT,
} from "../../../types/schedule";
import { TeamMembershipRole, TeamWithMembership } from "../../../types/team";
import { SolveTaskStatusResponseT } from "../../../types/solveTaskStatus";

export default function ScheduleNavBar({
  lng,
  teamWithMembership,
  currentPeriodStart,
  currentPeriodEnd,
  scheduleCampaign,
  scheduleViewSettings,
  handleToday,
  handlePreviousPeriod,
  handleNextPeriod,
  handleValidateSchedule,
  handleSendDuplicateRequest,
  updateScheduleViewSettings,
  handleChangeTimeFrame,
  handleOpenLHS,
  useSqsWorkflow = false, // Feature flag for SQS workflow
  onSqsSolveComplete,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  currentPeriodStart: dayjs.Dayjs;
  currentPeriodEnd: dayjs.Dayjs;
  scheduleCampaign: ScheduleT | null;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleToday: () => void;
  handlePreviousPeriod: () => void;
  handleNextPeriod: () => void;
  handleValidateSchedule: (scheduleId: string) => void;
  handleSendDuplicateRequest: (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string
  ) => void;
  updateScheduleViewSettings: (newSettings: ScheduleViewSettingsT) => void;
  handleChangeTimeFrame: (newTimeFrame: "week" | "month") => void;
  handleOpenLHS: (tabName: string) => void;
  useSqsWorkflow?: boolean;
  onSqsSolveComplete?: (result: SolveTaskStatusResponseT) => void;
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
      <TimeNavigation
        lng={lng}
        currentPeriodStart={currentPeriodStart}
        currentPeriodEnd={currentPeriodEnd}
        timeFrame={scheduleViewSettings.timeFrame}
        onToday={handleToday}
        onPreviousPeriod={handlePreviousPeriod}
        onNextPeriod={handleNextPeriod}
        onTimeFrameChange={handleChangeTimeFrame}
      />
      <DataViewSelector
        lng={lng}
        scheduleViewSettings={scheduleViewSettings}
        updateScheduleViewSettings={updateScheduleViewSettings}
      />
      <RoleBased
        role={teamWithMembership.membership.role}
        allowedRoles={[TeamMembershipRole.OWNER]}
      >
        <>
          <ScheduleSettings
            lng={lng}
            teamWithMembership={teamWithMembership}
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
              teamWithMembership={teamWithMembership}
              scheduleCampaign={scheduleCampaign}
              handleValidateSchedule={handleValidateSchedule}
              handleOpenLHS={handleOpenLHS}
              useSqsWorkflow={useSqsWorkflow}
              onSqsSolveComplete={onSqsSolveComplete}
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
                    backgroundColor: isHoveredCreateCampaign
                      ? "#f0f0f0"
                      : "white",
                  }}
                  onMouseEnter={() => setIsHoveredCreateCampaign(true)}
                  onMouseLeave={() => setIsHoveredCreateCampaign(false)}
                >
                  {t("create_campaign")}
                </button>
              </Link>
            </div>
          )}
        </>
      </RoleBased>
    </div>
  );
}
