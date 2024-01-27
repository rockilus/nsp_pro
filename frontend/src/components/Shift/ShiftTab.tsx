import React, { useRef, useCallback, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import ShiftTable from "./ShiftTable";

import { useShiftStore } from "../../stores/shiftStore";
import { useShiftDimensionStore } from "../../stores/shiftDimensionStore";
import { DefaultShiftFields } from "../../utils/constants";

export default function ShiftTab() {
  const shifts = useShiftStore((state) => state.shifts);
  const fetchShifts = useShiftStore((state) => state.fetchShifts);

  const shiftDimensions = useShiftDimensionStore(
    (state) => state.shiftDimensions
  );
  const fetchShiftDimensions = useShiftDimensionStore(
    (state) => state.fetchShiftDimensions
  );

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    fetchShiftDimensions();
  }, [fetchShiftDimensions]);

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Shifts Configuration
      </Typography>
      <ShiftTable
        shiftDimensions={shiftDimensions}
        shifts={shifts}
        defaultShiftFields={DefaultShiftFields}
      />
    </Box>
  );
}
