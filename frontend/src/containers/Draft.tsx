import * as React from "react";

import Box from "@mui/material/Box";

import ConstraintConfig from "../components/ConstraintConfig/ConstraintConfig";
import ShiftConfig from "../components/ConfigTables/ShiftConfig";
import WorkerConfig from "../components/ConfigTables/WorkerConfig";

export default function Draft() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <WorkerConfig />
      <ShiftConfig />
      <ConstraintConfig />
    </Box>
  );
}
