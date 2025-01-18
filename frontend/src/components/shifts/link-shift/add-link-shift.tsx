import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import Dialog from "@mui/material/Dialog";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
// Styles
import "./add-link-shift.css";
// Types
import { LinkShiftT, ShiftT, ShiftType } from "../../../types/shift";

dayjs.extend(utc);

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialogContent-root": {
    padding: theme.spacing(2),
  },
  "& .MuiDialogActions-root": {
    padding: theme.spacing(1),
  },
}));

export default function AddLinkShift({
  lng,
  teamId,
  shifts,
  shiftSelected1,
  shiftSelected2,
  setShiftSelected1,
  setShiftSelected2,
  handleAddLinkShift,
}: {
  lng: string;
  teamId: string;
  shifts: ShiftT[];
  shiftSelected1: ShiftT | null;
  shiftSelected2: ShiftT | null;
  setShiftSelected1: (shift: ShiftT | null) => void;
  setShiftSelected2: (shift: ShiftT | null) => void;
  handleAddLinkShift: (linkShift: LinkShiftT) => void;
}) {
  const handleShift1Change = (event: SelectChangeEvent) => {
    const shiftSelected = shifts.find(
      (shift) => shift.id === event.target.value
    );
    if (!shiftSelected) {
      return;
    }
    setShiftSelected1(shiftSelected);
    setShiftSelected2(null);
  };

  const handleShift2Change = (event: SelectChangeEvent) => {
    const shiftSelected = shifts.find(
      (shift) => shift.id === event.target.value
    );
    if (!shiftSelected) {
      return;
    }
    setShiftSelected2(shiftSelected);
  };

  const handleCreateLinkShift = () => {
    if (!shiftSelected1 || !shiftSelected2) {
      return;
    }
    handleAddLinkShift({
      id: "",
      teamId: teamId,
      shiftIds: [shiftSelected1.id, shiftSelected2.id],
    });
    setShiftSelected1(null);
    setShiftSelected2(null);
  };

  const shiftsForShift1 = shifts.filter(
    (shift) => shift.shiftType === ShiftType.NORMAL
  );

  const referenceDate = dayjs.utc().startOf("day");
  const shiftTimes = shiftsForShift1.reduce((acc, shift) => {
    const startTime = dayjs
      .utc(shift.startTime)
      .set("year", referenceDate.year())
      .set("month", referenceDate.month())
      .set("date", referenceDate.date());
    let endTime = dayjs
      .utc(shift.endTime)
      .set("year", referenceDate.year())
      .set("month", referenceDate.month())
      .set("date", referenceDate.date());
    if (endTime.isBefore(startTime)) {
      endTime = endTime.add(1, "day");
    }
    acc[shift.id] = { startTime, endTime };
    return acc;
  }, {} as Record<string, { startTime: dayjs.Dayjs; endTime: dayjs.Dayjs }>);

  const shiftsForShift2 = shiftSelected1
    ? shiftsForShift1.filter((shift) => {
        const shift1Times = shiftTimes[shiftSelected1.id];
        const shift2Times = shiftTimes[shift.id];
        return (
          shift.id !== shiftSelected1.id &&
          !(
            shift2Times.startTime.isBefore(shift1Times.endTime) &&
            shift2Times.endTime.isAfter(shift1Times.startTime)
          )
        );
      })
    : [];

  const renderShift1Select = () => (
    <React.Fragment>
      <div className="ls-select-shift">
        {/* <span className="ls-select-title">Select Shift 1:</span> */}
        <Select
          value={shiftSelected1 ? shiftSelected1.id : ""}
          onChange={handleShift1Change}
          displayEmpty
          fullWidth
          sx={{ width: "230px" }}
        >
          <MenuItem value="" disabled>
            Select a shift
          </MenuItem>
          {shiftsForShift1.map((shift) => (
            <MenuItem key={shift.id} value={shift.id}>
              <div className="ls-shift-select-item">
                <span className="ls-shift-name">{shift.name}</span>
                <span className="ls-shift-times">
                  {shift
                    ? `${shift.startTime.format(
                        "HH:mm"
                      )} - ${shift.endTime.format("HH:mm")}`
                    : ""}
                </span>
              </div>
            </MenuItem>
          ))}
        </Select>
      </div>
    </React.Fragment>
  );

  const renderShift2Select = () => (
    <React.Fragment>
      <div className="ls-select-shift">
        {/* <span className="ls-select-title">Select Shift 2:</span> */}
        <Select
          value={shiftSelected2 ? shiftSelected2.id : ""}
          onChange={handleShift2Change}
          displayEmpty
          fullWidth
          sx={{ width: "230px" }}
          disabled={!shiftSelected1}
        >
          <MenuItem value="" disabled>
            Select a shift
          </MenuItem>
          {shiftsForShift2.map((shift) => (
            <MenuItem key={shift.id} value={shift.id}>
              <div className="ls-shift-select-item">
                <span className="ls-shift-name">{shift.name}</span>
                <span className="ls-shift-times">
                  {shift
                    ? `${shift.startTime.format(
                        "HH:mm"
                      )} - ${shift.endTime.format("HH:mm")}`
                    : ""}
                </span>
              </div>
            </MenuItem>
          ))}
        </Select>
      </div>
    </React.Fragment>
  );

  return (
    <React.Fragment>
      <div className="add-link-shift-container">
        {renderShift1Select()}
        <SyncAltIcon sx={{ marginX: 1, fontSize: 16, color: "grey" }} />
        {renderShift2Select()}
        <Button variant="contained" onClick={handleCreateLinkShift}>
          Link
        </Button>
      </div>
    </React.Fragment>
  );
}
