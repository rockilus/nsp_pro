import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
// Components
import ScheduleDialogValidate from "../schedule-options/schedule-dialog-validate";
import { GetStatusLabel } from "../../data-display/get-status-label";
// Types
import { ScheduleT } from "../../../types/schedule";
//Constants
import {
  SolveStatusList,
  SolveStatusColors,
} from "../../../constants/constants";

dayjs.extend(utc);

export default function ScheduleWIP({
  lng,
  schedule,
  handleSolveSchedule,
  handleValidateSchedule,
}: {
  lng: string;
  schedule: ScheduleT;
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [isSolving, setIsSolving] = useState(false);

  const spaceBetween: string = "8px";

  const handleSolve = async () => {
    setIsSolving(true);
    await handleSolveSchedule(schedule.id);
    setIsSolving(false);
  };

  function getCampaignPeriodLabel(
    start: dayjs.Dayjs,
    end: dayjs.Dayjs
  ): string {
    if (start.isSame(end, "month") && start.isSame(end, "year")) {
      return start.format("D") + " - " + end.format("D MMM YYYY");
    } else if (!start.isSame(end, "month") && start.isSame(end, "year")) {
      return start.format("D MMM") + " - " + end.format("D MMM YYYY");
    } else {
      return start.format("D MMM YYYY") + " - " + end.format("D MMM YYYY");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "470px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginLeft: spaceBetween,
          height: "35px",
          width: "180px",
        }}
      >
        <span
          style={{
            width: "100%",
            color: "#616161",
            textTransform: "uppercase",
            fontSize: "0.8rem",
          }}
        >
          Campaign:
        </span>
        <span
          style={{
            width: "100%",
            color: "#616161",
            textTransform: "uppercase",
            fontSize: "0.8rem",
            fontWeight: 550,
          }}
        >
          {getCampaignPeriodLabel(schedule.startDate, schedule.endDate)}
        </span>
      </div>
      <Chip
        label={GetStatusLabel(lng, schedule.solveStatus)}
        color={
          (SolveStatusColors[SolveStatusList.indexOf(schedule.solveStatus)] as
            | "default"
            | "success"
            | "error"
            | "warning") || "default"
        }
        sx={{
          height: "35px",
          width: "120px",
          fontSize: "0.9rem",
          marginLeft: spaceBetween,
          fontWeight: 550,
        }}
      />
      {isSolving ? (
        <Box
          sx={{
            backgroundColor: "#1976d2",
            height: "35px",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginLeft: spaceBetween,
            marginRight: spaceBetween,
          }}
        >
          <CircularProgress size={20} sx={{ color: "white" }} />
        </Box>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={handleSolve}
          sx={{
            paddingLeft: 0.2,
            paddingRight: 0.2,
            marginLeft: spaceBetween,
            marginRight: spaceBetween,
            height: "35px",
          }}
        >
          {t("solve")}
        </Button>
      )}
      <ScheduleDialogValidate
        lng={lng}
        scheduleId={schedule.id}
        handleValidateSchedule={handleValidateSchedule}
      />
    </div>
  );
}
