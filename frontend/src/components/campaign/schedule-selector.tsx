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
import { ScheduleT, ScheduleSolveStatus } from "../../types/schedule";
//Constants
import { SolveStatusList, SolveStatusColors } from "../../constants/constants";

dayjs.extend(utc);

export default function ScheduleSelector({
  lng,
  schedule,
  handleUpdateSchedule,
}: {
  lng: string;
  schedule: ScheduleT;
  handleUpdateSchedule: (schedule: ScheduleT) => void;
}) {
  const { t } = useTranslation(lng, "campaign-page");
  const getStatusLabel = useStatusLabel(lng); // Use the custom hook

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
                value={schedule.startDate}
                onChange={(newValue) => {
                  if (!newValue) return;
                  handleUpdateSchedule({
                    ...schedule,
                    startDate: dayjs.utc(newValue),
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
                value={schedule.endDate}
                onChange={(newValue) => {
                  if (!newValue) return;
                  handleUpdateSchedule({
                    ...schedule,
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
                label={getStatusLabel(schedule.solveStatus)}
                color={
                  (SolveStatusColors[schedule.solveStatus] as
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
