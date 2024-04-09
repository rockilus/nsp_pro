import React from "react";
// Components
import CoverageEvent from "./CoverageEvent";
import ShiftDemandButton from "./ShiftDemandButton";
// Types
import { ColOverlayT } from "./types";
import { ShiftT } from "../Shift/types";
import { TeamT } from "../../containers/types";
// Constants
import {
  CovHeadRowHeight,
  CovBorderThick,
  CovBodyRowHeight,
  NumHoursInDay,
  NumQuarterHoursInHour,
} from "../../utils/constants";
import { emptyShift } from "../../utils/emptyObjects";

interface Props {
  team: TeamT;
  coverageId: string;
  colOverlays: ColOverlayT[];
  shifts: ShiftT[];
}

export default function CoveragesOverlay({
  team,
  coverageId,
  colOverlays,
  shifts,
}: Props) {
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
                team={team}
                buttonElement={
                  <button
                    style={{
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
                  ></button>
                }
                shiftDemand={{
                  id: "",
                  dayIndex: colIndex - 1,
                  shift: emptyShift,
                  coverageId: coverageId,
                }}
                shifts={shifts}
              />
            )}
            {colOverlay.SDOverlays.map((SDOverlay, index) => (
              <CoverageEvent
                key={`${colIndex}-${index}`}
                team={team}
                SDOverlay={SDOverlay}
                shifts={shifts}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
