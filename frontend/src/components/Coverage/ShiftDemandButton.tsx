import React from "react";
// MUI
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
// Components
import ShiftDemandPanel from "./ShiftDemandPanel";
// Types
import { ShiftDemandT } from "./types";
import { ShiftDefaultT } from "../Shift/types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  buttonElement: React.ReactNode;
  shiftDemand: ShiftDemandT;
  shifts: ShiftDefaultT[];
}

export default function ShiftDemandButton({
  team,
  buttonElement,
  shiftDemand,
  shifts,
}: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Box
        onClick={handleClick}
        sx={{ display: "inline-flex", minWidth: 0, cursor: "pointer" }}
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
          team={team}
          shiftDemand={shiftDemand}
          shifts={shifts}
          handleClose={handleClose}
        />
      </Menu>
    </Box>
  );
}
