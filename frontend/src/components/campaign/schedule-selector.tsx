import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Chip from "@mui/material/Chip";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import useStatusLabel from "../data-display/get-status-label";
import WorkTimeTable from "./work-time-table";
// Hooks
import { useIsMobile } from "../../hooks/useIsMobile";
// Styles
import "./schedule-selector.css";
import "../../styles/text-styles.css";

// Types
import { ScheduleT, WorkTimeTableT } from "../../types/schedule";
//Constants
import {
  SolveStatusColors,
  MAX_SCHEDULE_DURATION_MONTHS,
} from "../../constants/constants";

dayjs.extend(utc);

export default function ScheduleSelector({
  lng,
  scheduleCampaign,
  schedulesValidated,
  workTimeTable,
  handleUpdateSchedule,
}: {
  lng: string;
  scheduleCampaign: ScheduleT;
  schedulesValidated: ScheduleT[];
  workTimeTable: WorkTimeTableT | null;
  handleUpdateSchedule: (schedule: ScheduleT) => void;
}) {
  const { t } = useTranslation(lng, "campaign-page");
  const isMobile = useIsMobile();
  const getStatusLabel = useStatusLabel(lng); // Use the custom hook
  // Calculate the lastScheduleValidatedDate
  const lastScheduleValidatedDate = schedulesValidated.reduce(
    (latestDate, schedule) => {
      return schedule.endDate.isAfter(latestDate)
        ? schedule.endDate
        : latestDate;
    },
    dayjs(0),
  ); // Initialize with the earliest possible date
  const today = dayjs.utc().startOf("day");
  const minDate = lastScheduleValidatedDate.add(1, "day").isAfter(today)
    ? lastScheduleValidatedDate.add(1, "day")
    : today;

  const maxEndFromStart = scheduleCampaign.startDate
    ? scheduleCampaign.startDate.add(MAX_SCHEDULE_DURATION_MONTHS, "month")
    : null;

  return (
    <div className="campaign-info-container">
      <div className="campaign-and-work-time">
        <div className="campaign-info">
          <span className="title">{t("campaign")}</span>
          <div className="campaign-info-row">
            <div className="row-label-container">
              <span className="row-label">{t("start")}</span>
            </div>
            <div className="row-value-container">
              {
                <DatePicker
                  className="custom-date-picker"
                  minDate={minDate}
                  value={scheduleCampaign.startDate}
                  onChange={(newValue) => {
                    if (!newValue) return;
                    const newStart = dayjs.utc(newValue);
                    const maxEndForNewStart = newStart.add(
                      MAX_SCHEDULE_DURATION_MONTHS,
                      "month",
                    );
                    const newEnd = scheduleCampaign.endDate.isAfter(
                      maxEndForNewStart,
                    )
                      ? maxEndForNewStart
                      : scheduleCampaign.endDate;
                    handleUpdateSchedule({
                      ...scheduleCampaign,
                      startDate: newStart,
                      endDate: newEnd,
                    });
                  }}
                />
              }
            </div>
          </div>
          <div className="campaign-info-row">
            <div className="row-label-container">
              <span className="row-label">{t("end")}</span>
            </div>
            <div className="row-value-container">
              {
                <DatePicker
                  className="custom-date-picker"
                  minDate={scheduleCampaign.startDate}
                  maxDate={maxEndFromStart ?? undefined}
                  value={scheduleCampaign.endDate}
                  onChange={(newValue) => {
                    if (!newValue) return;
                    const candidate = dayjs.utc(newValue);
                    const maxAllowed = scheduleCampaign.startDate.add(
                      MAX_SCHEDULE_DURATION_MONTHS,
                      "month",
                    );
                    const finalEnd = candidate.isAfter(maxAllowed)
                      ? maxAllowed
                      : candidate;
                    handleUpdateSchedule({
                      ...scheduleCampaign,
                      endDate: finalEnd,
                    });
                  }}
                />
              }
            </div>
          </div>
          {/* <div className="campaign-info-row">
            <div className="row-label-container">
              <span className="row-label">{t("status")}</span>
            </div> */}
          {/* <div className="row-value-container">
              {
                <Chip
                  className="status-chip"
                  label={getStatusLabel(scheduleCampaign.solveStatus)}
                  color={
                    (SolveStatusColors[scheduleCampaign.solveStatus] as
                      | "default"
                      | "success"
                      | "error"
                      | "warning") || "default"
                  }
                />
              }
            </div> */}
          {/* </div> */}
        </div>

        {workTimeTable && (
          <div>
            <span className="title">{t("supply_and_demand")}</span>
            {isMobile ? (
              <div style={{ overflowX: "auto", width: "100%" }}>
                <WorkTimeTable lng={lng} data={workTimeTable} />
              </div>
            ) : (
              <WorkTimeTable lng={lng} data={workTimeTable} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
