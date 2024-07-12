import * as React from "react";
// MUI
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function WeeklyCalendarSkeleton() {
  return (
    <Stack
      direction="row"
      spacing="2px"
      sx={{ height: "600px", width: "100%" }}
    >
      <Skeleton
        variant="rectangular"
        sx={{
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "0px",
          borderBottomLeftRadius: "8px",
          borderBottomRightRadius: "0px",
          height: "100%",
          width: "49px",
        }}
      />
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          sx={{
            height: "100%",
            flex: 1,
          }}
        />
      ))}
      <Skeleton
        variant="rectangular"
        sx={{
          borderTopLeftRadius: "0px",
          borderTopRightRadius: "8px",
          borderBottomLeftRadius: "0px",
          borderBottomRightRadius: "8px",
          height: "100%",
          flex: 1,
        }}
      />
    </Stack>
  );
}
