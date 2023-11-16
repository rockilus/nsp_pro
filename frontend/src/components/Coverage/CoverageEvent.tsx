import React from "react";

import Button from "@mui/material/Button";

import AddIcon from "@mui/icons-material/Add";
import ShiftDemandButton from "./ShiftDemandButton";

import { SDOverlayT } from "./types";

interface Props {
  SDOverlay: SDOverlayT;
}

export default function CoverageEvent({ SDOverlay }: Props) {
  const newSDButton = () => {
    return (
      <div
        style={{
          width: "100%",
          height: `100%`,
          background: "#2196f3",
          opacity: 0.7,
          borderRadius: "4px",
          padding: "4px",
          color: "white",
          fontSize: "12px",
        }}
      >
        {SDOverlay.shiftDemand.shiftId}
      </div>
    );
  };

  return (
    <div
      style={{
        width: `${Math.floor(SDOverlay.width / SDOverlay.widthDivisor)}px`,
        height: `${SDOverlay.height}px`,
        backgroundColor: "red",
        position: "absolute",
        top: `${SDOverlay.top}px`,
        left: `${
          SDOverlay.left +
          Math.floor(SDOverlay.width / SDOverlay.widthDivisor) *
            SDOverlay.widthIndex
        }px`,
      }}
    >
      {/* <ShiftDemandButton
        buttonElement={newSDButton()}
        shiftDemand={SDOverlay.shiftDemand}
        shifts={[]}
      /> */}
    </div>
  );
}

// return (
//   <div style={{ position: "relative" }}>
//     {/* Overlay events using absolute positioning */}
//     {events.map((event) => (
//       <div
//         key={event.id}
//         style={{
//           position: "absolute",
//           top: `${event.start * 50}px`, // Adjust top position based on time slot
//           left: `${event.day * dayColWidth}px`, // Adjust left position based on day column
//           width: "90px", // Adjust width as needed
//           height: `${event.duration * 50}px`, // Adjust height based on event duration
//           background: "#2196f3", // Adjust background color
//           opacity: 0.7, // Adjust opacity as desired
//           borderRadius: "4px",
//           padding: "4px",
//           color: "white",
//           fontSize: "12px",
//         }}
//       >
//         {event.title}
//       </div>
//     ))}
//   </div>
// );
