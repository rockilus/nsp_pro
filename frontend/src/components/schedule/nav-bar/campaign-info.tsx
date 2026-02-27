import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
// MUI Icons
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
// Components
import ScheduleDialogValidate from "../schedule-options/schedule-dialog-validate";
import { GetStatusLabel } from "../../data-display/get-status-label";
import BreachesDialog from "../dialogs/breaches-dialog";
// Types
import { ScheduleT } from "../../../types/schedule";
import {
  SolveTaskStatusResponseT,
  ScheduleSolveStatus,
} from "../../../types/solveTaskStatus";
import { BreachT } from "../../../types/breach";
//Constants
import { SolveStatusColors } from "../../../constants/constants";
import { TeamWithMembership } from "@/types/team";
// SQS Solve
import { useSqsSolve } from "../../../app/lib/contexts/SqsSolveContext";
// Hooks
import { useCampaignSolveStatus } from "../../../app/lib/hooks/useCampaignSolveStatus";

export default function CampaignInfo({
  lng,
  teamWithMembership,
  scheduleCampaign,
  breaches,
  handleValidateSchedule,
  useSqsWorkflow = true, // Feature flag for SQS workflow
  onSqsSolveComplete, // Add this to destructuring
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  scheduleCampaign: ScheduleT;
  breaches: BreachT[];
  handleValidateSchedule: (scheduleId: string) => void;
  useSqsWorkflow?: boolean;
  onSqsSolveComplete?: (result: SolveTaskStatusResponseT) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");
  const {
    state: sqsState,
    startSolve,
    cancelSolve,
    clearError,
    isActiveSolve,
  } = useSqsSolve();

  // Get current campaign's solve status
  const currentSolveStatus = useCampaignSolveStatus(scheduleCampaign);

  const spaceBetween: string = "8px";

  // UI state
  const [breachesDialogOpen, setBreachesDialogOpen] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Handle SQS solve completion
  useEffect(() => {
    if (sqsState.status === "COMPLETED" && sqsState.result) {
      setShowSuccessNotification(true);
      // TODO: Update local state with solve results
      // This would be handled by the parent component in a real implementation
    }
  }, [sqsState.status, sqsState.result]);

  // Handle SQS solve errors
  useEffect(() => {
    if (sqsState.lastError || sqsState.errorMessage) {
      const error = sqsState.lastError || sqsState.errorMessage;
      setLastError(error);
      setShowErrorNotification(true);
    }
  }, [sqsState.lastError, sqsState.errorMessage]);

  const handleSolve = async () => {
    try {
      await startSolve(
        scheduleCampaign.id,
        teamWithMembership.team.id,
        undefined, // constraints
        onSqsSolveComplete, // Pass the completion callback
      );
    } catch (error) {
      console.error("Failed to start SQS solve:", error);
      setLastError((error as Error).message);
      setShowErrorNotification(true);
    }
  };

  const handleCancelSolve = async () => {
    try {
      await cancelSolve();
    } catch (error) {
      console.error("Failed to cancel solve:", error);
      setLastError((error as Error).message);
      setShowErrorNotification(true);
    }
  };

  const handleRetryPolling = () => {
    if (sqsState.solveId) {
      // Restart polling by calling startSolve again
      // This will restart the polling service
      startSolve(scheduleCampaign.id, teamWithMembership.team.id).catch(
        (error) => {
          console.error("Failed to retry polling:", error);
          setLastError((error as Error).message);
          setShowErrorNotification(true);
        },
      );
    }
  };

  function getCampaignPeriodLabel(
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
    lng: string,
  ): string {
    // Helper to format short month localized (3 letters, capitalized, no dots)
    const shortMonth = (d: dayjs.Dayjs) => {
      const raw = d.locale(lng).format("MMM").replace(/\./g, "");
      const short = raw.slice(0, 3);
      return short.charAt(0).toUpperCase() + short.slice(1);
    };

    if (start.isSame(end, "month") && start.isSame(end, "year")) {
      return (
        start.locale(lng).format("D") +
        " - " +
        (end.locale(lng).format("D") + " " + shortMonth(end) + " " + end.year())
      );
    } else if (!start.isSame(end, "month") && start.isSame(end, "year")) {
      return (
        start.locale(lng).format("D") +
        " " +
        shortMonth(start) +
        " - " +
        (end.locale(lng).format("D") + " " + shortMonth(end) + " " + end.year())
      );
    } else {
      return (
        start.locale(lng).format("D") +
        " " +
        shortMonth(start) +
        " " +
        start.year() +
        " - " +
        (end.locale(lng).format("D") + " " + shortMonth(end) + " " + end.year())
      );
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

  return (
    <>
      <div
        data-testid="campaign-info"
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
            data-testid="campaign-period-label"
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
            data-testid="campaign-period-dates"
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
              scheduleCampaign.endDate,
              lng,
            )}
          </span>
        </div>
        {teamWithMembership.team.useSolver && (
          <>
            <Tooltip title={t("solve_status_chip_tooltip")}>
              <Chip
                data-testid={`solve-status-chip-${currentSolveStatus}`}
                label={GetStatusLabel(lng, currentSolveStatus)}
                onClick={() => setBreachesDialogOpen(true)}
                color={
                  (SolveStatusColors[currentSolveStatus] as
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
            </Tooltip>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: spaceBetween,
              }}
            >
              <Tooltip title={t("solve_button_tooltip")}>
                <Button
                  data-testid="solve-button"
                  variant="contained"
                  color="primary"
                  onClick={handleSolve}
                  disabled={isActiveSolve}
                  sx={{
                    textTransform: "none",
                    paddingLeft: 0.2,
                    paddingRight: 0.2,
                    marginRight:
                      useSqsWorkflow && isActiveSolve ? "4px" : spaceBetween,
                    height: "35px",
                    width: useSqsWorkflow && isActiveSolve ? "120px" : "65px",
                  }}
                >
                  {isActiveSolve ? animatedSolve : t("solve")}
                </Button>
              </Tooltip>
              {useSqsWorkflow && isActiveSolve && (
                <Tooltip title={t("cancel_solve")}>
                  <IconButton
                    size="small"
                    onClick={handleCancelSolve}
                    sx={{
                      marginRight: "4px",
                      color: "error.main",
                    }}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {useSqsWorkflow && sqsState.lastError && !isActiveSolve && (
                <Tooltip title={t("retry_polling")}>
                  <IconButton
                    size="small"
                    onClick={handleRetryPolling}
                    sx={{
                      marginRight: spaceBetween,
                      color: "warning.main",
                    }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </>
        )}
        <ScheduleDialogValidate
          lng={lng}
          scheduleCampaign={scheduleCampaign}
          handleValidateSchedule={handleValidateSchedule}
        />
      </div>

      {/* Success notification */}
      <Snackbar
        data-testid="solve-success-snackbar"
        open={showSuccessNotification}
        autoHideDuration={6000}
        onClose={() => setShowSuccessNotification(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          data-testid="solve-success-alert"
          onClose={() => setShowSuccessNotification(false)}
          severity="success"
          variant="filled"
        >
          {t("solve_completed")}
        </Alert>
      </Snackbar>

      {/* Error notification */}
      <Snackbar
        data-testid="solve-error-snackbar"
        open={showErrorNotification}
        autoHideDuration={8000}
        onClose={() => {
          setShowErrorNotification(false);
          clearError();
          setLastError(null);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          data-testid="solve-error-alert"
          onClose={() => {
            setShowErrorNotification(false);
            clearError();
            setLastError(null);
          }}
          severity="error"
          variant="filled"
        >
          {lastError || t("solve_error")}
        </Alert>
      </Snackbar>

      {/* Breaches dialog */}
      <BreachesDialog
        lng={lng}
        breaches={breaches}
        open={breachesDialogOpen}
        onClose={() => setBreachesDialogOpen(false)}
      />
    </>
  );
}
