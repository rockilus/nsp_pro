import React from "react";
// MUI
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
// Components
import ShiftDemandButton from "./shift-demand-button";
// Types
import { ShiftDemandT } from "@/types/shift-demand";
import { ShiftT } from "../../../types/shift";
import { SpecialtyT } from "@/types/specialty";

export default function EventDivContent({
  lng,
  shiftDemand,
  shifts,
  specialties,
  staffingLabel,
  width,
  height,
  handleAddShiftDemands,
  handleUpdateShiftDemand,
  handleDeleteShiftDemands,
}: {
  lng: string;
  shiftDemand: ShiftDemandT;
  shifts: ShiftT[];
  specialties: SpecialtyT[];
  staffingLabel: string;
  width: number;
  height: number;
  handleAddShiftDemands: (shiftDemand: ShiftDemandT[]) => void;
  handleUpdateShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleDeleteShiftDemands: (shiftDemandId: string[]) => void;
}) {
  const textBottomMargin = -0.75;

  const shift = shifts.find((shift) => shift.id === shiftDemand.shiftId);

  const editButton = () => {
    return (
      shift && (
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
            {shift.acronym}
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
            {shift.startTime.format("HH:mm")} -{" "}
            {shift.startTime
              .add(shift.endTime.diff(shift.startTime, "minute"), "minutes")
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
            {shift.staffing.map((staffing, index) => {
              const specialty = specialties.find(
                (s) => s.id === staffing.specialtyId
              );
              return (
                <span key={staffing.specialtyId || index}>{`${
                  staffing.specialtyId === null
                    ? "Any"
                    : specialty
                    ? specialty.name
                    : "Name not found"
                }: ${staffing.staffing}`}</span>
              );
            })}
          </Typography>
        </Stack>
      )
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
      handleAddShiftDemands={handleAddShiftDemands}
      handleUpdateShiftDemand={handleUpdateShiftDemand}
      handleDeleteShiftDemands={handleDeleteShiftDemands}
    />
  );
}
