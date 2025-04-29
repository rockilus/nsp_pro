import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import {
  IconButton,
  Popover,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
// Components
import ScheduleSettingsView from "./schedule-settings-view";
// Styles
import "../../../styles/text-styles.css";
// Types
import {
  ScheduleT,
  DuplicateRequestT,
  ScheduleViewSettingsT,
} from "../../../types/schedule";
import { OccurrenceType } from "@/types/recurrence";

interface ScheduleSettingsProps {
  lng: string;
  campaign: ScheduleT | null;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleSendDuplicateRequest: (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string
  ) => void;
  updateScheduleViewSettings: (newSettings: ScheduleViewSettingsT) => void;
  handleChangeTimeFrame: (newTimeFrame: "week" | "month") => void;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
  lng,
  campaign,
  startDate,
  endDate,
  scheduleViewSettings,
  handleSendDuplicateRequest,
  updateScheduleViewSettings,
  handleChangeTimeFrame,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isDuplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [isWarningDialogOpen, setWarningDialogOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState<{
    label: string;
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
  } | null>(null);
  const [occurrenceType, setOccurrenceType] = useState<OccurrenceType>(
    OccurrenceType.ASSIGNMENT
  );
  const [copyAssignments, setCopyAssignments] = useState(false);
  const [copyDemands, setCopyDemands] = useState(false);
  const [copyAssignmentsError, setCopyAssignmentsError] = useState(false);
  const [copyDemandsError, setCopyDemandsError] = useState(false);

  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const handleDuplicateWeek = () => {
    setDuplicateDialogOpen(true);
    handleClosePopover();
  };

  const handleConfirmDuplicate = async () => {
    if (!targetWeek || !campaign) return;

    const duplicateRequest: DuplicateRequestT = {
      sourcePeriod: {
        startDate: startDate,
        endDate: endDate,
      },
      targetPeriod: {
        startDate: targetWeek.startDate,
        endDate: targetWeek.endDate,
      },
      options: {
        copyAssignments: copyAssignments,
        copyDemands: copyDemands,
      },
    };

    // Validation: At least one checkbox should be selected
    if (!copyAssignments && !copyDemands) {
      // Raise an error to the user in the checkbox components
      setCopyAssignmentsError(!copyAssignments);
      setCopyDemandsError(!copyDemands);
      return;
    }

    // Reset errors if validation passes
    setCopyAssignmentsError(false);
    setCopyDemandsError(false);

    await handleSendDuplicateRequest(
      duplicateRequest,
      campaign.id,
      campaign.teamId
    );
    setWarningDialogOpen(false);
    setDuplicateDialogOpen(false);
    setTargetWeek(null);
    setOccurrenceType(OccurrenceType.ASSIGNMENT);
    setAnchorEl(null);
  };

  const handleCloseWarningDialog = () => {
    setTargetWeek(null);
    setWarningDialogOpen(false);
  };

  const weekOptions = useMemo(() => {
    if (!campaign) return [];

    const campaignStart = campaign.startDate.startOf("day");
    const campaignEnd = campaign.endDate.endOf("day");

    const weeks = [];
    let currentStart = campaignStart;

    while (currentStart.isSameOrBefore(campaignEnd)) {
      const currentEnd = dayjs.min(
        currentStart.endOf("week").add(1, "day"),
        campaignEnd
      );
      if (!(currentStart.isBefore(endDate) && currentEnd.isAfter(startDate))) {
        weeks.push({
          label: `${currentStart.format("D MMMM YYYY")} - ${currentEnd.format(
            "D MMMM YYYY"
          )}`,
          startDate: currentStart,
          endDate: currentEnd,
        });
      }
      currentStart = currentEnd.add(1, "day");
    }

    return weeks;
  }, [campaign, startDate, endDate]);

  return (
    <div>
      <IconButton onClick={handleOpenPopover}>
        <SettingsIcon />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <div style={{ padding: "16px", minWidth: "300px" }}>
          <ScheduleSettingsView
            lng={lng}
            scheduleViewSettings={scheduleViewSettings}
            updateScheduleViewSettings={updateScheduleViewSettings}
            handleChangeTimeFrame={handleChangeTimeFrame}
          />

          {/* Tools Section */}
          <div>
            <h4
              className="subtitle settings-view-title"
              style={{ margin: "0 0 8px 0" }}
            >
              {t("tools")}
            </h4>
            <MenuItem
              onClick={handleDuplicateWeek}
              disabled={
                !campaign ||
                scheduleViewSettings.timeFrame !== "week" ||
                endDate.diff(startDate, "day") + 1 !== 7 ||
                startDate.day() !== 1
              }
              sx={{ fontSize: "0.8rem" }}
            >
              {t("duplicate_week")}
            </MenuItem>
          </div>
        </div>
      </Popover>

      <Dialog
        open={isDuplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
      >
        <DialogTitle>{t("duplicate_week")}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel>{t("target_week")}</InputLabel>
            <Select
              value={targetWeek?.label || ""}
              onChange={(e) => {
                const selectedWeek = weekOptions.find(
                  (week) => week.label === e.target.value
                );
                setTargetWeek(selectedWeek || null);
              }}
              placeholder="Select a week"
              style={{ minWidth: "300px" }}
            >
              {weekOptions.map((week, index) => (
                <MenuItem key={`${index}-${week.label}`} value={week.label}>
                  {week.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={copyAssignments}
                onChange={(e) => setCopyAssignments(e.target.checked)}
              />
            }
            label={
              <span
                style={{
                  fontSize: "0.875rem",
                  color: copyAssignmentsError ? "red" : "inherit",
                }}
              >
                {t("assignment")}
              </span>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={copyDemands}
                onChange={(e) => setCopyDemands(e.target.checked)}
              />
            }
            label={
              <span
                style={{
                  fontSize: "0.875rem",
                  color: copyDemandsError ? "red" : "inherit",
                }}
              >
                {t("demand")}
              </span>
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setTargetWeek(null);
              setDuplicateDialogOpen(false);
            }}
            sx={{ textTransform: "none" }}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={() => {
              if (targetWeek) {
                setWarningDialogOpen(true);
              }
            }}
            color="primary"
            variant="contained"
            disabled={!targetWeek || (!copyAssignments && !copyDemands)}
            sx={{ textTransform: "none" }}
          >
            {t("duplicate")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isWarningDialogOpen} onClose={handleCloseWarningDialog}>
        <DialogTitle>{t("duplicate_week")}</DialogTitle>
        <DialogContent>
          {t("duplicate_warning_part_1")} <b>{targetWeek?.label}</b>{" "}
          {t("duplicate_warning_part_2")}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseWarningDialog}
            sx={{ textTransform: "none" }}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirmDuplicate}
            color="primary"
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            {t("confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ScheduleSettings;
