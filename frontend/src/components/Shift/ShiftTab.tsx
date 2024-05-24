import React from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
// Components
import ShiftTable from "./ShiftTable";
// Types
import { ShiftT, ShiftDimensionT } from "./types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  shifts: ShiftT[];
  shiftDimensions: ShiftDimensionT[];
}

export default function ShiftTab({ team, shifts, shiftDimensions }: Props) {
  const { t } = useTranslation();

  const DefaultWorkShiftFields: Record<string, string>[] = [
    { name: "color", label: t("common.color") },
    { name: "name", label: t("common.name") },
    { name: "start_time", label: t("common.start_time") },
    { name: "end_time", label: t("common.end_time") },
    { name: "staffing", label: t("common.staffing") },
  ];
  const DefaultRestShiftFields: Record<string, string>[] = [
    { name: "color", label: t("common.color") },
    { name: "name", label: t("common.name") },
    { name: "start_time", label: t("common.start_time") },
    { name: "end_time", label: t("common.end_time") },
  ];

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
