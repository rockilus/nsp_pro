import React from "react";

import CoverageEvent from "./CoverageEvent";
import { ColOverlayT } from "./types";
import { ShiftIdNameT } from "../Schedule/types";

interface Props {
  colOverlays: ColOverlayT[];
  shifts: ShiftIdNameT[];
}

export default function CoveragesOverlay({ colOverlays, shifts }: Props) {
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
            // opacity: 0.5,
          }}
        >
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            {colOverlay.SDOverlays.map((SDOverlay, index) => (
              <CoverageEvent
                key={`${colIndex}-${index}`}
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
