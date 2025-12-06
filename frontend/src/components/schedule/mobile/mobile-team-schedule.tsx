import React from "react";
import dayjs from "dayjs";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Local components
import DateCarousel from "./date-carousel";

interface MobileTeamScheduleProps {
  lng: string;
  weeks: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
  today: dayjs.Dayjs;
  onVisibleMonthChange: (month: string) => void;
  onScrollToTodayReady: (handler: () => void) => void;
}

export default function MobileTeamSchedule({
  lng,
  weeks,
  today,
  onVisibleMonthChange,
  onScrollToTodayReady,
}: MobileTeamScheduleProps) {
  return (
    <Box>
      {/* Horizontal date carousel */}
      <DateCarousel
        weeks={weeks}
        today={today}
        onVisibleMonthChange={onVisibleMonthChange}
        onScrollToTodayReady={onScrollToTodayReady}
      />

      {/* Placeholder content */}
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
    </Box>
  );
}
