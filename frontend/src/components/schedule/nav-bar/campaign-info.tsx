import React, { useState } from "react";
import dayjs from "dayjs";
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
import { ScheduleT, SolveDetailsStatus } from "../../../types/schedule";
//Constants
import {
  SolveStatusList,
  SolveStatusColors,
} from "../../../constants/constants";

export default function CampaignInfo({
  lng,
  scheduleCampaign,
  solveStatus,
  handleSolveSchedule,
  handleValidateSchedule,
}: {
  lng: string;
  scheduleCampaign: ScheduleT;
  solveStatus: SolveDetailsStatus | null | "error";
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const spaceBetween: string = "8px";

  const handleSolve = async () => {
    handleSolveSchedule(scheduleCampaign.id);
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
          {getCampaignPeriodLabel(
            scheduleCampaign.startDate,
            scheduleCampaign.endDate
          )}
        </span>
      </div>
      <Chip
        label={GetStatusLabel(lng, scheduleCampaign.solveStatus)}
        color={
          (SolveStatusColors[scheduleCampaign.solveStatus] as
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
      {solveStatus === SolveDetailsStatus.PENDING ||
      solveStatus === SolveDetailsStatus.STARTED ||
      solveStatus === SolveDetailsStatus.RETRY ? (
        <Box
          sx={{
            backgroundColor: "#1976d2",
            height: "35px",
            width: "65px",
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
            width: "65px",
          }}
        >
          {t("solve")}
        </Button>
      )}
      <ScheduleDialogValidate
        lng={lng}
        scheduleCampaign={scheduleCampaign}
        handleValidateSchedule={handleValidateSchedule}
      />
    </div>
  );
}
