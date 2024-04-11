import React from "react";
// MUI
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
// Components
import RequestPanel from "./RequestPanel";
// Types
import { RequestT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  buttonElement: React.ReactNode;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
}

export default function RequestButton({
  team,
  buttonElement,
  request,
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
              width: 300,
            },
          },
        }}
      >
        <RequestPanel
          team={team}
          request={request}
          workers={workers}
          shifts={shifts}
          handleClose={handleClose}
        />
      </Menu>
    </Box>
  );
}
