import React from "react";
import dayjs from "dayjs";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import TuneIcon from "@mui/icons-material/Tune";

interface MobileScheduleNavProps {
  visibleMonth: string;
  onSettingsClick: () => void;
  onTodayClick: () => void;
  lng: string;
}

export default function MobileScheduleNav({
  visibleMonth,
  onSettingsClick,
  onTodayClick,
  lng,
}: MobileScheduleNavProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flex: 1,
        justifyContent: "space-between",
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, color: "text.secondary" }}
      >
        {visibleMonth}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <IconButton onClick={onSettingsClick} size="small">
          <TuneIcon />
        </IconButton>
        <Button
          onClick={onTodayClick}
          sx={{
            minWidth: 30,
            height: 30,
            // Rounded-square (not fully circular) for a friendlier look
            borderRadius: "6px",
            padding: 0,
            color: "text.secondary",
            // Slightly heavier border to visually match the month label weight
            border: (theme) => `2px solid ${theme.palette.text.secondary}`,
            backgroundColor: "transparent",
            // Match the month label font weight
            fontWeight: 600,
          }}
        >
          {dayjs.utc().format("D")}
        </Button>
      </Box>
    </Box>
  );
}
