import React, { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import utc from "dayjs/plugin/utc";
// Components
import DataViewSelector from "./data-view-selector";
import TimeViewSelector from "./time-view-selector";
import CampaignInfo from "./campaign-info";
// Types
import { ScheduleT } from "../../../types/schedule";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function ScheduleNavBar({
  lng,
  selectedDisplay,
  showBreaches,
  schedule,
  setSelectedDisplay,
  switchShowBreaches,
  handleSolveSchedule,
  handleValidateSchedule,
}: {
  lng: string;
  selectedDisplay: string;
  showBreaches: boolean;
  schedule: ScheduleT | null;
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
      <TimeViewSelector />
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
