import * as React from "react";

import Box from "@mui/material/Box";

import WorkerConfig from "../components/DraftComponents/WorkerConfig";

export default function Draft() {
  return (
    <Box sx={{ display: "flex" }}>
      <WorkerConfig />
    </Box>
  );
}
