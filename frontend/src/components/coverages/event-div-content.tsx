import React from "react";
// MUI
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
// Components
import ShiftDemandButton from "./shift-demand-button";
// Types
import { ShiftDemandT } from "../../types/coverage";
import { ShiftT } from "../../types/shift";

export default function EventDivContent({
  lng,
  shiftDemand,
  shifts,
  staffingLabel,
  width,
  height,
  handleAddShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: {
  lng: string;
  shiftDemand: ShiftDemandT;
  shifts: ShiftT[];
  staffingLabel: string;
  width: number;
  height: number;
  handleAddShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleUpdateShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleDeleteShiftDemand: (coverageId: string, shiftDemandId: string) => void;
}) {
  const textBottomMargin = -0.75;

  const editButton = () => {
    return (
      <Stack
        direction="column"
        spacing={0}
        alignItems="left"
        sx={{ width: width }}
      >
        <Typography
          variant="caption"
          display="block"
          sx={{
            color: "white",
            fontWeight: "bold",
            width: "100%",
            overflow: "hidden",
            marginBottom: textBottomMargin,
          }}
        >
          {shiftDemand.shift.name}
        </Typography>
        <Typography
          variant="caption"
          display="block"
          sx={{
            color: "white",
            padding: 0,
            whiteSpace: "nowrap",
            width: "100%",
            overflow: "hidden",
            marginBottom: textBottomMargin,
          }}
        >
          {shiftDemand.shift.startTime.format("HH:mm")} -{" "}
          {shiftDemand.shift.startTime
            .add(
              shiftDemand.shift.endTime.diff(
                shiftDemand.shift.startTime,
                "minute"
              ),
              "minutes"
            )
            .format("HH:mm")}
        </Typography>
        <Typography
          variant="caption"
          display="block"
          sx={{
            color: "white",
            width: "100%",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {`${staffingLabel}: `}
          {shiftDemand.shift.staffing}
        </Typography>
      </Stack>
    );
  };

  return (
    <ShiftDemandButton
      lng={lng}
      buttonElement={editButton()}
      shiftDemand={shiftDemand}
      shifts={shifts}
      width={width}
      height={height}
      handleAddShiftDemand={handleAddShiftDemand}
      handleUpdateShiftDemand={handleUpdateShiftDemand}
      handleDeleteShiftDemand={handleDeleteShiftDemand}
    />
  );
}
