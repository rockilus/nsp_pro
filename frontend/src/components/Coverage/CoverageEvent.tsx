import React from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import ShiftDemandButton from "./ShiftDemandButton";
import { SDOverlayT } from "./types";
import { ShiftIdNameT } from "../Schedule/types";

interface Props {
  SDOverlay: SDOverlayT;
  shifts: ShiftIdNameT[];
}

export default function CoverageEvent({ SDOverlay, shifts }: Props) {
  const covEventWidth = Math.floor(SDOverlay.width / SDOverlay.widthDivisor); // px
  const covEventPadL = 2; // px
  const covEventMarginB = -0.75;

  const newSDButton = () => {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "left",
          height: `${SDOverlay.height}px`,
          bgcolor: "primary.main",
          borderRadius: "4px",
          paddingLeft: `${covEventPadL}px`,
        }}
      >
        <Stack direction="column" spacing={0} alignItems="left">
          <Typography
            variant="caption"
            display="block"
            sx={{
              color: "white",
              fontWeight: "bold",
              width: `${covEventWidth - covEventPadL}px`,
              overflow: "hidden",
              marginBottom: covEventMarginB,
            }}
          >
            {shifts.find((shift) => shift.id === SDOverlay.shiftDemand.shiftId)
              ?.name || "No shift"}
          </Typography>
          <Typography
            variant="caption"
            display="block"
            sx={{
              color: "white",
              padding: 0,
              whiteSpace: "nowrap",
              width: `${covEventWidth - covEventPadL}px`,
              overflow: "hidden",
              marginBottom: covEventMarginB,
            }}
          >
            {SDOverlay.shiftDemand.startTime.format("HH:mm")} -{" "}
            {SDOverlay.shiftDemand.startTime
              .add(SDOverlay.shiftDemand.duration, "minutes")
              .format("HH:mm")}
          </Typography>
          <Typography
            variant="caption"
            display="block"
            sx={{
              color: "white",
              width: `${covEventWidth - covEventPadL}px`,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {SDOverlay.shiftDemand.quantity}
            {" staff"}
          </Typography>
        </Stack>
      </Box>
    );
  };

  return (
    <div
      style={{
        // width: `${Math.floor(SDOverlay.width / SDOverlay.widthDivisor)}px`,
        width: `${covEventWidth}px`,
        height: `${SDOverlay.height}px`,
        // backgroundColor: "red",
        position: "absolute",
        top: `${SDOverlay.top}px`,
        left: `${
          SDOverlay.left +
          Math.floor(SDOverlay.width / SDOverlay.widthDivisor) *
            SDOverlay.widthIndex
        }px`,
      }}
    >
      <ShiftDemandButton
        buttonElement={newSDButton()}
        shiftDemand={SDOverlay.shiftDemand}
        shifts={shifts}
      />
    </div>
  );
}
