import React from "react";
// MUI
import ToggleButton from "@mui/material/ToggleButton";

export const hardSoftButton = (hard: boolean, handleToggleHard: () => void) => {
  return (
    <ToggleButton value="hard" onChange={handleToggleHard} sx={{ height: 30 }}>
      {hard ? "Hard" : "Soft"}
    </ToggleButton>
  );
};
