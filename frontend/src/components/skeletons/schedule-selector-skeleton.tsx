import * as React from "react";
// MUI
import Skeleton from "@mui/material/Skeleton";

export default function ScheduleSelectorSkeleton() {
  return (
    <Skeleton
      variant="rectangular"
      sx={{
        borderRadius: "8px",
        height: "100%",
      }}
    />
  );
}
