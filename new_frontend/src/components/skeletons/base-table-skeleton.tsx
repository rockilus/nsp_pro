import * as React from "react";
// MUI
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function BaseTableSkeleton({
  numInternalRows,
}: {
  numInternalRows: number;
}) {
  return (
    <Stack spacing="5px">
      <Skeleton
        variant="rectangular"
        sx={{
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
          borderBottomLeftRadius: "0px",
          borderBottomRightRadius: "0px",
          height: "45px",
        }}
      />
      {Array.from({ length: numInternalRows }).map((_, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          sx={{
            height: "45px",
          }}
        />
      ))}
      <Skeleton
        variant="rectangular"
        sx={{
          borderTopLeftRadius: "0px",
          borderTopRightRadius: "0px",
          borderBottomLeftRadius: "8px",
          borderBottomRightRadius: "8px",
          height: "45px",
        }}
      />
    </Stack>
  );
}
