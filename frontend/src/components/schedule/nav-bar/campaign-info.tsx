import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
// MUI Icons
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
// lucide-react
import { Sparkle } from "lucide-react";
// Components
import ScheduleDialogValidate from "../schedule-options/schedule-dialog-validate";
import { GetStatusLabel } from "../../data-display/get-status-label";
import BreachesDialog from "../dialogs/breaches-dialog";
import CustomSolveDialog from "./CustomSolveDialog";
// Types
import { ScheduleT } from "../../../types/schedule";
import {
  SolveTaskStatusResponseT,
  ScheduleSolveStatus,
  SolveScope,
  SolveScopeType,
} from "../../../types/solveTaskStatus";
import { BreachT } from "../../../types/breach";
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import {
  ScheduleSelectionState,
  SelectedScheduleCell,
} from "../../../types/scheduleSelection";
//Constants
import { SolveStatusColors } from "../../../constants/constants";
import { TeamWithMembership } from "@/types/team";
// SQS Solve
import { useSqsSolve } from "../../../app/lib/contexts/SqsSolveContext";
// Hooks
import { useCampaignSolveStatus } from "../../../app/lib/hooks/useCampaignSolveStatus";

const SCOPE_LABEL_MAP: Record<SolveScopeType, string> = {
  FULL: "solve_full_campaign",
  DUTIES: "solve_duties",
  NON_DUTIES: "solve_non_duties",
  CUSTOM: "solve_custom",
};

export default function CampaignInfo({
  lng,
  teamWithMembership,
  scheduleCampaign,
  breaches,
  handleValidateSchedule,
  useSqsWorkflow = true, // Feature flag for SQS workflow
  onSqsSolveComplete,
  workers = [],
  shifts = [],
  selectionState,
  groupBy = "worker",
  selectedSolveScope = "FULL",
  onSolveOptionChange,
  workerSolveCells = [],
  shiftSolveCells = [],
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  scheduleCampaign: ScheduleT;
  breaches: BreachT[];
  handleValidateSchedule: (scheduleId: string) => void;
  useSqsWorkflow?: boolean;
  onSqsSolveComplete?: (result: SolveTaskStatusResponseT) => void;
  workers?: WorkerT[];
  shifts?: ShiftT[];
  selectionState?: ScheduleSelectionState;
  groupBy?: "worker" | "shift";
  selectedSolveScope?: SolveScopeType;
  onSolveOptionChange?: (scope: SolveScopeType) => void;
  workerSolveCells?: SelectedScheduleCell[];
  shiftSolveCells?: SelectedScheduleCell[];
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

  // Split button dropdown state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // Custom solve dialog state
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

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

  const handleSolve = async (solveScope?: SolveScope) => {
    try {
      await startSolve(
        scheduleCampaign.id,
        teamWithMembership.team.id,
        solveScope,
        onSqsSolveComplete, // Pass the completion callback
      );
    } catch (error) {
      console.error("Failed to start SQS solve:", error);
      setLastError((error as Error).message);
      setShowErrorNotification(true);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleMenuItemClick = (
    scopeType: "FULL" | "DUTIES" | "NON_DUTIES" | "CUSTOM",
  ) => {
    handleMenuClose();
    onSolveOptionChange?.(scopeType);
  };

  const handleCustomConfirm = (scope: SolveScope) => {
    setCustomDialogOpen(false);
    handleSolve(scope);
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
              {/* Split Generate button */}
              <Tooltip title={isActiveSolve ? "" : t("solve_button_tooltip")}>
                <span>
                  <ButtonGroup
                    variant="contained"
                    color="primary"
                    disabled={isActiveSolve}
                    sx={{
                      height: "35px",
                      marginRight:
                        useSqsWorkflow && isActiveSolve ? "4px" : spaceBetween,
                    }}
                  >
                    <Button
                      data-testid="solve-button"
                      onClick={() => {
                        if (selectedSolveScope === "CUSTOM") {
                          setCustomDialogOpen(true);
                        } else {
                          handleSolve({ scope_type: selectedSolveScope });
                        }
                      }}
                      sx={{
                        textTransform: "none",
                        paddingLeft: 1.5,
                        paddingRight: 1.5,
                        width: isActiveSolve ? "120px" : undefined,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {isActiveSolve ? (
                        animatedSolve
                      ) : (
                        <>
                          <Sparkle size={25} />
                          {t(SCOPE_LABEL_MAP[selectedSolveScope])}
                        </>
                      )}
                    </Button>
                    <Button
                      data-testid="solve-dropdown-button"
                      size="small"
                      aria-controls={menuOpen ? "solve-menu" : undefined}
                      aria-expanded={menuOpen ? "true" : undefined}
                      aria-haspopup="menu"
                      onClick={handleMenuOpen}
                      sx={{ paddingLeft: 0, paddingRight: 0, minWidth: "28px" }}
                    >
                      <ArrowDropDownIcon />
                    </Button>
                  </ButtonGroup>
                </span>
              </Tooltip>

              {/* Dropdown menu */}
              <Menu
                id="solve-menu"
                anchorEl={menuAnchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                MenuListProps={{ "aria-labelledby": "solve-dropdown-button" }}
              >
                <MenuItem
                  data-testid="solve-scope-menu-item-FULL"
                  onClick={() => handleMenuItemClick("FULL")}
                >
                  <ListItemText>{t("solve_full_campaign")}</ListItemText>
                </MenuItem>
                <MenuItem
                  data-testid="solve-scope-menu-item-DUTIES"
                  onClick={() => handleMenuItemClick("DUTIES")}
                >
                  <ListItemText>{t("solve_duties")}</ListItemText>
                </MenuItem>
                <MenuItem
                  data-testid="solve-scope-menu-item-NON_DUTIES"
                  onClick={() => handleMenuItemClick("NON_DUTIES")}
                >
                  <ListItemText>{t("solve_non_duties")}</ListItemText>
                </MenuItem>
                <MenuItem
                  data-testid="solve-scope-menu-item-CUSTOM"
                  onClick={() => handleMenuItemClick("CUSTOM")}
                >
                  <ListItemText>{t("solve_custom")}</ListItemText>
                </MenuItem>
              </Menu>

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

      {/* Custom solve dialog */}
      <CustomSolveDialog
        open={customDialogOpen}
        onClose={() => setCustomDialogOpen(false)}
        onConfirm={handleCustomConfirm}
        workers={workers}
        shifts={shifts}
        scheduleCampaign={scheduleCampaign}
        workerSolveCells={workerSolveCells}
        shiftSolveCells={shiftSolveCells}
        groupBy={groupBy}
        lng={lng}
      />
    </>
  );
}
