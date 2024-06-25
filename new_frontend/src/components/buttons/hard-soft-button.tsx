import React from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import ToggleButton from "@mui/material/ToggleButton";

const HardSoftButton = (
  lng: string,
  hard: boolean,
  handleToggleHard: () => void
) => {
  const { t } = useTranslation(lng, "constraint-page");
  return (
    <ToggleButton value="hard" onChange={handleToggleHard} sx={{ height: 30 }}>
      {hard ? t("hard") : t("soft")}
    </ToggleButton>
  );
};

export { HardSoftButton };
