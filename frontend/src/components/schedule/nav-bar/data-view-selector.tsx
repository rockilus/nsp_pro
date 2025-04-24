import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
// Types
import { ScheduleViewSettingsT } from "../../../types/schedule";

export default function DataViewSelector({
  lng,
  scheduleViewSettings,
  updateScheduleViewSettings,
}: {
  lng: string;
  scheduleViewSettings: ScheduleViewSettingsT;
  updateScheduleViewSettings: (newSettings: ScheduleViewSettingsT) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: "shift" | "worker" | null
  ) => {
    if (newAlignment !== null) {
      const newSettings = {
        ...scheduleViewSettings,
        groupBy: newAlignment,
      };
      updateScheduleViewSettings(newSettings);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "0 16px",
      }}
    >
      <ToggleButtonGroup
        color="primary"
        value={scheduleViewSettings.groupBy}
        exclusive
        onChange={handleChange}
        aria-label="Platform"
      >
        <ToggleButton
          value="shift"
          sx={{
            textTransform: "none",
            height: "35px",
            fontSize: "0.9rem",
          }}
        >
          {t("shift")}
        </ToggleButton>
        <ToggleButton
          value="worker"
          sx={{
            textTransform: "none",
            height: "35px",
            fontSize: "0.9rem",
          }}
        >
          {t("worker")}
        </ToggleButton>
      </ToggleButtonGroup>
      <ToggleButton
        value="breaches"
        sx={{
          textTransform: "none",
          height: "35px",
          fontSize: "0.9rem",
          marginLeft: "8px",
        }}
        selected={scheduleViewSettings.showBreaches}
        onClick={() => {
          updateScheduleViewSettings({
            ...scheduleViewSettings,
            showBreaches: !scheduleViewSettings.showBreaches,
          });
        }}
      >
        {t("breaches")}
      </ToggleButton>
    </div>
  );
}
