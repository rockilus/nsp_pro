import * as React from "react";
// MUI
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
// Components
import BaseTableSkeleton from "./base-table-skeleton";

export default function TablesSkeleton({
  numTables,
  numInternalRows,
}: {
  numTables: number;
  numInternalRows: number;
}) {
  return (
    <Box
      sx={{
        margin: 2,
      }}
    >
      <Stack spacing="20px">
        {Array.from({ length: numTables }).map((_, index) => (
          <BaseTableSkeleton key={index} numInternalRows={numInternalRows} />
        ))}
      </Stack>
    </Box>
  );
}
