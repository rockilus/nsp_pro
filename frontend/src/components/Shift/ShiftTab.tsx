import React from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import ShiftTable from "./ShiftTable";
// Types
import { ShiftT, ShiftDimensionT } from "./types";
import { TeamT } from "../../containers/types";
// Constants
import {
  DefaultWorkShiftFields,
  DefaultRestShiftFields,
} from "../../utils/constants";

interface Props {
  team: TeamT;
  shifts: ShiftT[];
  shiftDimensions: ShiftDimensionT[];
}

export default function ShiftTab({ team, shifts, shiftDimensions }: Props) {
  return (
    <Box style={{ width: "100%" }}>
      <Box
        sx={{
          border: "1px solid grey",
          margin: 2,
          overflowX: "auto",
          borderRadius: 2,
          backgroundColor: "none",
        }}
      >
        <ShiftTable
          team={team}
          isRest={false}
          shiftDimensions={shiftDimensions.filter((sd) => !sd.isRest)}
          shifts={shifts.filter((s) => !s.isTimeOff)}
          defaultShiftFields={DefaultWorkShiftFields}
        />
      </Box>
      <Box
        sx={{
          border: "1px solid grey",
          margin: 2,
          overflowX: "auto",
          borderRadius: 2,
          backgroundColor: "none",
        }}
      >
        <ShiftTable
          team={team}
          isRest={true}
          shiftDimensions={shiftDimensions.filter((sd) => sd.isRest)}
          shifts={shifts.filter((s) => s.isTimeOff)}
          defaultShiftFields={DefaultRestShiftFields}
        />
      </Box>
    </Box>
  );
}
