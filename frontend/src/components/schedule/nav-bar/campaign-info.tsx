import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
// Components
import ScheduleDialogValidate from "../schedule-options/schedule-dialog-validate";
import { GetStatusLabel } from "../../data-display/get-status-label";
// Types
import { ScheduleT, SolveDetailsStatus } from "../../../types/schedule";
//Constants
import { SolveStatusColors } from "../../../constants/constants";
import { TeamWithMembership } from "@/types/team";

export default function CampaignInfo({
  lng,
  teamWithMembership,
  scheduleCampaign,
  solveStatus,
  handleSolveSchedule,
  handleValidateSchedule,
  handleOpenLHS,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  scheduleCampaign: ScheduleT;
  solveStatus: SolveDetailsStatus | null | "error";
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
  handleOpenLHS: (tabName: string) => void;
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

  // Animated solve button text state
  const solveText = `${t("solving")}...`;
  const [animatedSolve, setAnimatedSolve] = useState(solveText);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!solveText) return;
    const interval = setInterval(() => {
      setAnimatedSolve((prev) => {
        if (!prev) return prev;
        const chars = solveText.split("");
        const i = activeIndex;
        chars[i] =
          chars[i] === chars[i].toUpperCase()
            ? chars[i].toLowerCase()
            : chars[i].toUpperCase();
        return chars.join("");
      });
      setActiveIndex((prev) => (prev + 1) % solveText.length);
    }, 200); // Adjust interval as desired
    return () => clearInterval(interval);
  }, [solveText, activeIndex]);

  const isSolving =
    solveStatus === SolveDetailsStatus.PENDING ||
    solveStatus === SolveDetailsStatus.STARTED ||
    solveStatus === SolveDetailsStatus.RETRY;

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
          {`${t("campaign")}:`}
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
      {teamWithMembership.team.useSolver && (
        <>
          <Chip
            label={GetStatusLabel(lng, scheduleCampaign.solveStatus)}
            onClick={() => handleOpenLHS("breaches")}
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
          <Button
            variant="contained"
            color="primary"
            onClick={handleSolve}
            disabled={isSolving}
            sx={{
              textTransform: "none",
              paddingLeft: 0.2,
              paddingRight: 0.2,
              marginLeft: spaceBetween,
              marginRight: spaceBetween,
              height: "35px",
              width: "65px",
            }}
          >
            {isSolving ? animatedSolve : t("solve")}
          </Button>
        </>
      )}
      <ScheduleDialogValidate
        lng={lng}
        scheduleCampaign={scheduleCampaign}
        handleValidateSchedule={handleValidateSchedule}
      />
    </div>
  );
}
