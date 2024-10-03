import React from "react";
// Components
import EventDivContent from "./event-div-content";
// Types
import { EventT, ShiftDemandT } from "../../../types/coverage";
import { ShiftT } from "../../../types/shift";

export default function EventToDiv({
  lng,
  event,
  rowHeight,
  columnWidth,
  staffingLabel,
  shifts,
  handleAddShiftDemands,
  handleUpdateShiftDemand,
  handleDeleteShiftDemands,
}: {
  lng: string;
  event: EventT;
  rowHeight: number;
  columnWidth: number;
  staffingLabel: string;
  shifts: ShiftT[];
  handleAddShiftDemands: (shiftDemand: ShiftDemandT[]) => void;
  handleUpdateShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleDeleteShiftDemands: (shiftDemandId: string[]) => void;
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
        backgroundColor: event.shift.color,
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
      <EventDivContent
        lng={lng}
        shiftDemand={event.shiftDemand}
        shifts={shifts}
        staffingLabel={staffingLabel}
        width={width}
        height={height}
        handleAddShiftDemands={handleAddShiftDemands}
        handleUpdateShiftDemand={handleUpdateShiftDemand}
        handleDeleteShiftDemands={handleDeleteShiftDemands}
      />
    </div>
  );
}
