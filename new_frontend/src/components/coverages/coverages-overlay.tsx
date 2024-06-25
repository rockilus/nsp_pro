import React from "react";
import dayjs from "dayjs";
// MUI
import Button from "@mui/material/Button";
// Components
import CoverageEvent from "./coverage-event";
import ShiftDemandButton from "./shift-demand-button";
// Types
import { ColOverlayT, ShiftDemandT } from "../../types/coverage";
import { ShiftT } from "../../types/shift";
// Constants
import {
  CovBorderThick,
  CovBodyRowHeight,
  NumHoursInDay,
  NumQuarterHoursInHour,
} from "../../constants/constants";

export default function CoveragesOverlay({
  lng,
  coverageId,
  colOverlays,
  shifts,
  handleAddShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: {
  lng: string;
  coverageId: string;
  colOverlays: ColOverlayT[];
  shifts: ShiftT[];
  handleAddShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleUpdateShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleDeleteShiftDemand: (coverageId: string, shiftDemandId: string) => void;
}) {
  const emptyShift = {
    teamId: "",
    id: "",
    name: "",
    startTime: dayjs(),
    endTime: dayjs(),
    staffing: 0,
    color: "",
    isTimeOff: false,
    shiftProperties: [],
  };

  return (
    <div>
      {colOverlays.map((colOverlay, colIndex) => (
        <div
          key={colIndex}
          style={{
            width: `${colOverlay.width}px`,
            height: "100%",
            backgroundColor: colOverlay.color,
            position: "absolute",
            top: "0px",
            left: `${colOverlay.left}px`,
          }}
        >
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            {colIndex !== 0 && (
              <ShiftDemandButton
                lng={lng}
                buttonElement={
                  <Button
                    sx={{
                      cursor: "pointer",
                      opacity: 0.5,
                      backgroundColor: "transparent",
                      border: "none",
                      transition: "background-color 0.3s ease",
                      width: "100%",
                      height: `${
                        CovBodyRowHeight *
                          (NumHoursInDay * NumQuarterHoursInHour) +
                        CovBorderThick * (NumHoursInDay - 1)
                      }px`,
                      position: "absolute",
                      // top: `${CovHeadRowHeight + CovBorderThick}px`,
                      top: 0,
                    }}
                    onMouseOver={(e) => {
                      (e.target as HTMLElement).style.backgroundColor =
                        "lightgrey";
                    }}
                    onMouseOut={(e) => {
                      (e.target as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                  ></Button>
                }
                shiftDemand={{
                  id: "",
                  dayIndex: colIndex - 1,
                  shift: emptyShift,
                  coverageId: coverageId,
                }}
                shifts={shifts}
                handleAddShiftDemand={handleAddShiftDemand}
                handleUpdateShiftDemand={handleUpdateShiftDemand}
                handleDeleteShiftDemand={handleDeleteShiftDemand}
              />
            )}
            {colOverlay.SDOverlays.map((SDOverlay, index) => (
              <CoverageEvent
                key={`${colIndex}-${index}`}
                lng={lng}
                SDOverlay={SDOverlay}
                shifts={shifts}
                handleAddShiftDemand={handleAddShiftDemand}
                handleUpdateShiftDemand={handleUpdateShiftDemand}
                handleDeleteShiftDemand={handleDeleteShiftDemand}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
