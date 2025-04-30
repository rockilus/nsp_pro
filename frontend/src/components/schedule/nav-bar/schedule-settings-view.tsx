import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import {
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  FormGroup,
} from "@mui/material";
// Styles
import "./schedule-settings-view.css";
import "../../../styles/text-styles.css";
// Types
import { ScheduleViewSettingsT } from "../../../types/schedule";

interface ScheduleSettingsViewProps {
  lng: string;
  scheduleViewSettings: ScheduleViewSettingsT;
  updateScheduleViewSettings: (newSettings: ScheduleViewSettingsT) => void;
  handleChangeTimeFrame: (newTimeFrame: "week" | "month") => void;
}

const ScheduleSettingsView: React.FC<ScheduleSettingsViewProps> = ({
  lng,
  scheduleViewSettings,
  updateScheduleViewSettings,
  handleChangeTimeFrame,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const handleTimeFrameChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeFrame: "week" | "month"
  ) => {
    if (newTimeFrame) {
      handleChangeTimeFrame(newTimeFrame);
    }
  };

  const handleGroupByChange = (
    event: React.MouseEvent<HTMLElement>,
    newGroupBy: "shift" | "worker"
  ) => {
    if (newGroupBy) {
      updateScheduleViewSettings({
        ...scheduleViewSettings,
        groupBy: newGroupBy,
      });
    }
  };

  const handleShowAssignmentsToggle = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateScheduleViewSettings({
      ...scheduleViewSettings,
      showAssignments: event.target.checked,
    });
  };

  const handleShowDailyShiftDemandsToggle = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateScheduleViewSettings({
      ...scheduleViewSettings,
      showDailyShiftDemands: event.target.checked,
    });
  };

  const handleShowRequestsToggle = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateScheduleViewSettings({
      ...scheduleViewSettings,
      showRequests: event.target.checked,
    });
  };

  return (
    <div className="settings-view-container">
      <h4
        className="subtitle settings-view-title"
        style={{
          margin: "0 0 8px 0",
        }}
      >
        {t("view")}
      </h4>
      <div className="settings-view-line">
        <span className="settings-view-line-label">{t("time_frame")}:</span>
        <ToggleButtonGroup
          color="primary"
          value={scheduleViewSettings.timeFrame}
          exclusive
          onChange={handleTimeFrameChange}
          size="small"
          style={{ marginLeft: "8px" }}
        >
          <ToggleButton
            value="week"
            sx={{
              textTransform: "none",
              height: "25px",
              width: "60px",
              fontSize: "0.8rem",
            }}
          >
            {t("week")}
          </ToggleButton>
          <ToggleButton
            value="month"
            sx={{
              textTransform: "none",
              height: "25px",
              width: "60px",
              fontSize: "0.8rem",
            }}
          >
            {t("month")}
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className="settings-view-line">
        <span className="settings-view-line-label">{t("group_by")}:</span>
        <ToggleButtonGroup
          color="primary"
          value={scheduleViewSettings.groupBy}
          exclusive
          onChange={handleGroupByChange}
          size="small"
          style={{ marginLeft: "8px" }}
        >
          <ToggleButton
            value="shift"
            sx={{
              textTransform: "none",
              height: "25px",
              width: "60px",
              fontSize: "0.8rem",
            }}
          >
            {t("shift")}
          </ToggleButton>
          <ToggleButton
            value="worker"
            sx={{
              textTransform: "none",
              height: "25px",
              width: "60px",
              fontSize: "0.8rem",
            }}
          >
            {t("worker")}
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={scheduleViewSettings.showAssignments}
              onChange={handleShowAssignmentsToggle}
              size="small"
            />
          }
          label={
            <span className="settings-view-line-label">{t("assignment")}</span>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={scheduleViewSettings.showDailyShiftDemands}
              onChange={handleShowDailyShiftDemandsToggle}
              size="small"
            />
          }
          label={
            <span className="settings-view-line-label">{t("demand")}</span>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={scheduleViewSettings.showRequests}
              onChange={handleShowRequestsToggle}
              size="small"
              disabled={true}
            />
          }
          label={
            <span className="settings-view-line-label">{t("request")}</span>
          }
        />
      </FormGroup>
    </div>
  );
};

export default ScheduleSettingsView;
