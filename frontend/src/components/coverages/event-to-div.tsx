import React from "react";
// MUI
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
// Components
import EventDivContent from "./event-div-content";
// Types
import { EventT, ShiftDemandT } from "../../types/coverage";
import { ShiftT } from "../../types/shift";

export default function EventToDiv({
  lng,
  event,
  rowHeight,
  columnWidth,
  staffingLabel,
  shifts,
  handleAddShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: {
  lng: string;
  event: EventT;
  rowHeight: number;
  columnWidth: number;
  staffingLabel: string;
  shifts: ShiftT[];
  handleAddShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleUpdateShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleDeleteShiftDemand: (coverageId: string, shiftDemandId: string) => void;
}) {
  const spaceBetween = 1;
  const borderWidth = 1;
  const defaultWidth =
    (columnWidth - borderWidth - spaceBetween * (event.widthDenominator - 1)) /
    event.widthDenominator;
  const startX = (defaultWidth + spaceBetween) * event.indexPosition;
  const width =
    ((columnWidth - borderWidth - spaceBetween * (event.widthDenominator - 1)) *
      event.widthNumerator) /
      event.widthDenominator +
    spaceBetween * (event.widthNumerator - 1);
  const height = rowHeight * event.durationHour;
  const textBottomMargin = -0.75;
  return (
    <div
      key={event.shiftDemand.id}
      style={{
        top: rowHeight * event.startHour,
        left: startX,
        width: width,
        height: height,
        backgroundColor: event.shiftDemand.shift.color,
        opacity: 0.8,
        color: "white",
        borderTopLeftRadius: event.borderTopRadius ? "4px" : "0px",
        borderTopRightRadius: event.borderTopRadius ? "4px" : "0px",
        borderBottomLeftRadius: event.borderBottomRadius ? "4px" : "0px",
        borderBottomRightRadius: event.borderBottomRadius ? "4px" : "0px",
        position: "absolute",
        zIndex: 5,
      }}
    >
      {/* <Stack direction="column" spacing={0} alignItems="left">
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
          {event.shiftDemand.shift.name}
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
          {event.shiftDemand.shift.startTime.format("HH:mm")} -{" "}
          {event.shiftDemand.shift.startTime
            .add(
              event.shiftDemand.shift.endTime.diff(
                event.shiftDemand.shift.startTime,
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
          {event.shiftDemand.shift.staffing}
        </Typography>
      </Stack> */}
      <EventDivContent
        lng={lng}
        shiftDemand={event.shiftDemand}
        shifts={shifts}
        staffingLabel={staffingLabel}
        width={width}
        height={height}
        handleAddShiftDemand={handleAddShiftDemand}
        handleUpdateShiftDemand={handleUpdateShiftDemand}
        handleDeleteShiftDemand={handleDeleteShiftDemand}
      />
    </div>
  );
}
