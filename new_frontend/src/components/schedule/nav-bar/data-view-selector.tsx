import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

export default function DataViewSelector({
  lng,
  selectedDisplay,
  showBreaches,
  setSelectedDisplay,
  switchShowBreaches,
}: {
  lng: string;
  selectedDisplay: string;
  showBreaches: boolean;
  setSelectedDisplay: (newSelectedDisplay: string) => void;
  switchShowBreaches: () => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: string
  ) => {
    if (newAlignment !== null) {
      setSelectedDisplay(newAlignment);
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
        value={selectedDisplay}
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
        selected={showBreaches}
        onClick={switchShowBreaches}
      >
        {t("breaches")}
      </ToggleButton>
    </div>
  );
}
