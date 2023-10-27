import React from "react";

import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";

import ConstraintPanel from "./ConstraintPanel";
import { ConstraintT, TreeNodeT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  buttonElement: React.ReactNode;
  constraint: ConstraintT;
  tree: TreeNodeT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ConstraintButton({
  buttonElement,
  constraint,
  tree,
  workers,
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
        <ConstraintPanel
          constraint={constraint}
          tree={tree}
          workers={workers}
          shifts={shifts}
          handleClose={handleClose}
        />
      </Menu>
    </Box>
  );
}
