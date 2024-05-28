import React from "react";
import { useTranslation } from "react-i18next";
// MUI
import ToggleButton from "@mui/material/ToggleButton";

const HardSoftButton = (hard: boolean, handleToggleHard: () => void) => {
  const { t } = useTranslation();
  return (
    <ToggleButton value="hard" onChange={handleToggleHard} sx={{ height: 30 }}>
      {hard ? t("common.hard") : t("common.soft")}
    </ToggleButton>
  );
};

export { HardSoftButton };
