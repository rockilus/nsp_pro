import React from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface MobileTeamScheduleProps {
  lng: string;
}

export default function MobileTeamSchedule({ lng }: MobileTeamScheduleProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "50vh",
        padding: 3,
      }}
    >
      <Typography variant="h6" color="text.secondary">
        Team schedule view coming soon
      </Typography>
    </Box>
  );
}
