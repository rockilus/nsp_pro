import React, { useState } from "react";
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
        <button>Go to campaign</button>
      )}
    </div>
  );
}
