import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
// MUI Icons
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
// Components
import ScheduleDialogValidate from "../schedule-options/schedule-dialog-validate";
import { GetStatusLabel } from "../../data-display/get-status-label";
// Types
import { ScheduleT, SolveDetailsStatus } from "../../../types/schedule";
import { SolveTaskStatusResponseT } from "../../../types/solveTaskStatus";
//Constants
import { SolveStatusColors } from "../../../constants/constants";
import { TeamWithMembership } from "@/types/team";
// SQS Solve
import { useSqsSolve } from "../../../app/lib/contexts/SqsSolveContext";

export default function CampaignInfo({
  lng,
  teamWithMembership,
  scheduleCampaign,
  solveStatus,
  handleSolveSchedule,
  handleValidateSchedule,
  handleOpenLHS,
  useSqsWorkflow = false, // Feature flag for SQS workflow
  onSqsSolveComplete, // Add this to destructuring
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  scheduleCampaign: ScheduleT;
  solveStatus: SolveDetailsStatus | null | "error";
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
  handleOpenLHS: (tabName: string) => void;
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

  const spaceBetween: string = "8px";

  // UI state
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
    if (useSqsWorkflow) {
      try {
        await startSolve(
          scheduleCampaign.id,
          teamWithMembership.team.id,
          undefined, // constraints
          onSqsSolveComplete // Pass the completion callback
        );
      } catch (error) {
        console.error("Failed to start SQS solve:", error);
        setLastError((error as Error).message);
        setShowErrorNotification(true);
      }
    } else {
      handleSolveSchedule(scheduleCampaign.id);
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
        }
      );
    }
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

  // Get solve status for display
  const getDisplaySolveStatus = () => {
    if (useSqsWorkflow) {
      switch (sqsState.status) {
        case "PENDING":
          return SolveDetailsStatus.PENDING;
        case "IN_PROGRESS":
          return SolveDetailsStatus.STARTED;
        case "COMPLETED":
          return SolveDetailsStatus.SUCCESS;
        case "FAILED":
          return SolveDetailsStatus.FAILURE;
        default:
          return null;
      }
    }
    return solveStatus;
  };

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

  const displaySolveStatus = getDisplaySolveStatus();
  const isSolving = useSqsWorkflow
    ? isActiveSolve
    : displaySolveStatus === SolveDetailsStatus.PENDING ||
      displaySolveStatus === SolveDetailsStatus.STARTED ||
      displaySolveStatus === SolveDetailsStatus.RETRY;

  const getSolveButtonContent = () => {
    if (isSolving) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <CircularProgress size={16} color="inherit" />
          {useSqsWorkflow ? (
            <span style={{ fontSize: "0.8rem" }}>
              {sqsState.status === "PENDING" ? t("queued") : animatedSolve}
            </span>
          ) : (
            animatedSolve
          )}
        </div>
      );
    }
    return t("solve");
  };

  return (
    <>
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: spaceBetween,
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={handleSolve}
                disabled={isSolving}
                sx={{
                  textTransform: "none",
                  paddingLeft: 0.2,
                  paddingRight: 0.2,
                  marginRight:
                    useSqsWorkflow && isSolving ? "4px" : spaceBetween,
                  height: "35px",
                  width: useSqsWorkflow && isSolving ? "120px" : "65px",
                }}
              >
                {isSolving ? animatedSolve : t("solve")}
              </Button>
              {useSqsWorkflow && isSolving && (
                <Tooltip title={t("cancelSolve")}>
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
                <Tooltip title={t("retryPolling")}>
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
        open={showSuccessNotification}
        autoHideDuration={6000}
        onClose={() => setShowSuccessNotification(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setShowSuccessNotification(false)}
          severity="success"
          variant="filled"
        >
          {t("solveCompleted")}
        </Alert>
      </Snackbar>

      {/* Error notification */}
      <Snackbar
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
          onClose={() => {
            setShowErrorNotification(false);
            clearError();
            setLastError(null);
          }}
          severity="error"
          variant="filled"
        >
          {lastError || t("solveError")}
        </Alert>
      </Snackbar>
    </>
  );
}
