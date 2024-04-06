import React, { useEffect } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import ShiftTable from "./ShiftTable";
// Stores
import { useShiftStore } from "../../stores/shiftStore";
import { useShiftDimensionStore } from "../../stores/shiftDimensionStore";
// Types
import { TeamT } from "../../containers/types";
// Constants
import { DefaultShiftFields } from "../../utils/constants";

interface Props {
  team: TeamT;
}

export default function ShiftTab({ team }: Props) {
  const shifts = useShiftStore((state) => state.shifts);
  const restShifts = useShiftStore((state) => state.restShifts);
  const fetchAllShifts = useShiftStore((state) => state.fetchAllShifts);

  const shiftDimensions = useShiftDimensionStore(
    (state) => state.shiftDimensions
  );
  const fetchShiftDimensions = useShiftDimensionStore(
    (state) => state.fetchShiftDimensions
  );

  useEffect(() => {
    fetchAllShifts(team.id);
  }, [fetchAllShifts, team.id]);

  useEffect(() => {
    fetchShiftDimensions(team.id);
  }, [fetchShiftDimensions, team.id]);

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Shifts configuration
      </Typography>
      <Typography variant="h4" align="left">
        Shifts
      </Typography>
      <ShiftTable
        team={team}
        isRest={false}
        shiftDimensions={shiftDimensions.filter((sd) => !sd.isRest)}
        shifts={shifts}
        defaultShiftFields={DefaultShiftFields}
      />
      <Typography variant="h4" align="left">
        Rest
      </Typography>
      <ShiftTable
        team={team}
        isRest={true}
        shiftDimensions={shiftDimensions.filter((sd) => sd.isRest)}
        shifts={restShifts}
        defaultShiftFields={DefaultShiftFields}
      />
    </Box>
  );
}
