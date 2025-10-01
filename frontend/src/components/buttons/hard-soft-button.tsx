import React from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import ToggleButton from "@mui/material/ToggleButton";

const HardSoftButton = (
  lng: string,
  hard: boolean,
  constraintId: string,
  handleToggleHard: () => void
) => {
  const { t } = useTranslation(lng, "constraint-page");
  return (
    <ToggleButton
      value="hard"
      onChange={handleToggleHard}
      sx={{ height: 30 }}
      data-testid={`constraint-hard-soft-button-${constraintId}`}
    >
      {hard ? t("hard") : t("soft")}
    </ToggleButton>
  );
};

export { HardSoftButton };
