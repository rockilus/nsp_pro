import React from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface MobileTeamScheduleProps {
  lng: string;
  onScrollToTodayReady: (handler: () => void) => void;
}

export default function MobileTeamSchedule({
  lng,
  onScrollToTodayReady,
}: MobileTeamScheduleProps) {
  // Placeholder handler for scroll to today
  const handleScrollToToday = React.useCallback(() => {
    // TODO: Implement scroll-to-today for team view
    console.log("Scroll to today in team view (not yet implemented)");
  }, []);

  // Expose handler to parent
  React.useEffect(() => {
    onScrollToTodayReady(handleScrollToToday);
  }, [handleScrollToToday, onScrollToTodayReady]);

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
