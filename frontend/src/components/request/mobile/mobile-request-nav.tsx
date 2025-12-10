import React from "react";
import dayjs from "dayjs";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import TuneIcon from "@mui/icons-material/Tune";

interface MobileRequestNavProps {
  visibleMonth: string;
  onSettingsClick: () => void;
  onTodayClick: () => void;
  lng: string;
}

export default function MobileRequestNav({
  visibleMonth,
  onSettingsClick,
  onTodayClick,
  lng,
}: MobileRequestNavProps) {
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
            borderRadius: "6px",
            padding: 0,
            color: "text.secondary",
            border: (theme) => `2px solid ${theme.palette.text.secondary}`,
            backgroundColor: "transparent",
            fontWeight: 600,
          }}
        >
          {dayjs.utc().format("D")}
        </Button>
      </Box>
    </Box>
  );
}
