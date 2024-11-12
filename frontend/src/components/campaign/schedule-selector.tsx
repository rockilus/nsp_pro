import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Chip from "@mui/material/Chip";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import useStatusLabel from "../data-display/get-status-label";
// Styles
import "./schedule-selector.css";
import "../../styles/text-styles.css";
// Types
import { ScheduleT } from "../../types/schedule";
//Constants
import { SolveStatusColors } from "../../constants/constants";

dayjs.extend(utc);

export default function ScheduleSelector({
  lng,
  scheduleCampaign,
  schedulesValidated,
  handleUpdateSchedule,
}: {
  lng: string;
  scheduleCampaign: ScheduleT;
  schedulesValidated: ScheduleT[];
  handleUpdateSchedule: (schedule: ScheduleT) => void;
}) {
  const { t } = useTranslation(lng, "campaign-page");
  const getStatusLabel = useStatusLabel(lng); // Use the custom hook
  // Calculate the lastScheduleValidatedDate
  const lastScheduleValidatedDate = schedulesValidated.reduce(
    (latestDate, schedule) => {
      return schedule.endDate.isAfter(latestDate)
        ? schedule.endDate
        : latestDate;
    },
    dayjs(0)
  ); // Initialize with the earliest possible date
  const today = dayjs.utc().startOf("day");
  const minDate = lastScheduleValidatedDate.add(1, "day").isAfter(today)
    ? lastScheduleValidatedDate.add(1, "day")
    : today;

  return (
    <div className="campaign-info-container">
      <span className="title">{t("campaign")}</span>
      <div className="campaign-info">
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
                  handleUpdateSchedule({
                    ...scheduleCampaign,
                    startDate: dayjs.utc(newValue),
                    endDate: newValue.isAfter(scheduleCampaign.endDate)
                      ? newValue
                      : scheduleCampaign.endDate,
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
                value={scheduleCampaign.endDate}
                onChange={(newValue) => {
                  if (!newValue) return;
                  handleUpdateSchedule({
                    ...scheduleCampaign,
                    endDate: dayjs.utc(newValue),
                  });
                }}
              />
            }
          </div>
        </div>
        <div className="campaign-info-row">
          <div className="row-label-container">
            <span className="row-label">{t("status")}</span>
          </div>
          <div className="row-value-container">
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
          </div>
        </div>
      </div>
    </div>
  );
}
