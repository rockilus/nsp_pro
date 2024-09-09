import React from "react";
// MUI
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
// Components
import ShiftDemandPanel from "./shift-demand-panel";
// Types
import { ShiftDemandT } from "../../types/coverage";
import { ShiftT } from "../../types/shift";

export default function ShiftDemandButton({
  lng,
  buttonElement,
  shiftDemand,
  shifts,
  width,
  height,
  handleAddShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: {
  lng: string;
  buttonElement: React.ReactNode;
  shiftDemand: ShiftDemandT;
  shifts: ShiftT[];
  width?: number;
  height?: number;
  handleAddShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleUpdateShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleDeleteShiftDemand: (coverageId: string, shiftDemandId: string) => void;
}) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box style={{ width: "100%", height: "100%" }}>
      <Box
        onClick={handleClick}
        sx={{
          display: "inline-flex",
          minWidth: 0,
          width: "100%",
          height: "100%",
          cursor: "pointer",
        }}
      >
        {buttonElement}
      </Box>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        slotProps={{
          paper: {
            style: {
              width: 410,
            },
          },
        }}
      >
        <ShiftDemandPanel
          lng={lng}
          shiftDemand={shiftDemand}
          shifts={shifts}
          handleClose={handleClose}
          handleAddShiftDemand={handleAddShiftDemand}
          handleUpdateShiftDemand={handleUpdateShiftDemand}
          handleDeleteShiftDemand={handleDeleteShiftDemand}
        />
      </Menu>
    </Box>
  );
}
