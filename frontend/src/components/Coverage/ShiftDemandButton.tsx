import React from "react";

import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";

import ShiftDemandPanel from "./ShiftDemandPanel";
import { CoverageT } from "./types";
import { ShiftIdNameT } from "../Schedule/types";

interface Props {
  buttonElement: React.ReactNode;
  coverage: CoverageT;
  shifts: ShiftIdNameT[];
}

export default function ShiftDemandButton({
  buttonElement,
  coverage,
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
      <Box onClick={handleClick} sx={{ display: "inline-flex", minWidth: 0 }}>
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
              width: "95%",
            },
          },
        }}
      >
        {/* <ShiftDemandPanel
          coverage={coverage}
          shifts={shifts}
          handleClose={handleClose}
        /> */}
      </Menu>
    </Box>
  );
}
