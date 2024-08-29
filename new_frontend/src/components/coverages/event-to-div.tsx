import React from "react";
// MUI
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
// Types
import { EventT } from "../../types/coverage";

const EventToDiv = (
  event: EventT,
  rowHeight: number,
  columnWidth: number,
  staffingLabel: string
): JSX.Element => {
  const spaceBetween = 1;
  const borderWidth = 1;
  const width =
    (columnWidth - borderWidth - spaceBetween * (event.maxOverlap - 1)) /
    event.maxOverlap;
  const textBottomMargin = -0.75;
  return (
    <div
      key={event.shiftDemand.id}
      style={{
        top: rowHeight * event.startHour,
        left: (width + spaceBetween) * event.indexPosition,
        width: width,
        height: rowHeight * event.durationHour,
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
      <Stack direction="column" spacing={0} alignItems="left">
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
      </Stack>
    </div>
  );
};

export default EventToDiv;
