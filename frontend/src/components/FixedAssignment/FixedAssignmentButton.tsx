import React from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";

import FixedAssignmentPanel from "./FixedAssignmentPanel";
import { FixedAssignmentT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  buttonElement: React.ReactNode;
  fixedAssignment: FixedAssignmentT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function FixedAssignmentButton({
  buttonElement,
  fixedAssignment,
  workers,
  shifts,
}: Props) {
  const dateToTimeZero = (date: Date): Date => {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0)
    );
  };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  //   setAnchorEl(event.currentTarget);
  // };
  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Box onClick={handleClick} sx={{ display: "inline-flex", minWidth: 0 }}>
        {/* <Button
          // id="basic-button"
          // aria-controls={open ? "basic-menu" : undefined}
          // aria-haspopup="true"
          // aria-expanded={open ? "true" : undefined}
          // onClick={handleClick}
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
        >
          Create
        </Button> */}
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
              width: 300,
            },
          },
        }}
      >
        <FixedAssignmentPanel
          fixedAssignment={fixedAssignment}
          workers={workers}
          shifts={shifts}
          handleClose={handleClose}
        />
      </Menu>
    </Box>
  );
}
