import React from "react";
// Types
import { EventT } from "../../types/coverage";

const eventToDiv = (
  event: EventT,
  rowHeight: number,
  columnWidth: number
): JSX.Element => {
  const spaceBetween = 1;
  const borderWidth = 1;
  const width =
    (columnWidth - borderWidth - spaceBetween * (event.maxOverlap - 1)) /
    event.maxOverlap;
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
      {event.shiftDemand.shift.name}
    </div>
  );
};

export default eventToDiv;
