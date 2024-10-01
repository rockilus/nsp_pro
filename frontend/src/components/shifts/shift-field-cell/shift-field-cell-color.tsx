import React, { useState } from "react";
import { CirclePicker, ColorResult } from "react-color";
// MUI
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import TableCell from "@mui/material/TableCell";
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from "../../../types/shift";
// Constants
import { ShiftColors } from "../../../constants/constants";

export default function ShiftFieldCellColor({
  shift,
  handleUpdateShift,
}: {
  shift: ShiftT;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (
      shift.leaveType === ShiftLeaveType.NONE &&
      shift.restType !== ShiftRestType.OFF
    ) {
      setAnchorEl(event.currentTarget);
    }
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleColorChange = (newColor: ColorResult) => {
    if (newColor.hex !== shift.color) {
      handleUpdateShift({ ...shift, color: newColor.hex });
    }
    handleClose();
  };

  return (
    <TableCell component="th" scope="row" sx={{ width: 30, paddingY: 0 }}>
      <Box style={{ width: "100%" }}>
        <Box
          onClick={handleClick}
          sx={{
            display: "inline-flex",
            minWidth: 0,
            cursor:
              shift.leaveType === ShiftLeaveType.NONE &&
              shift.restType !== ShiftRestType.OFF
                ? "pointer"
                : "default",
          }}
        >
          <Chip
            label=""
            style={{
              width: "30px",
              height: "22px",
              backgroundColor: shift.color,
            }}
          />
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
                width: 260,
              },
            },
          }}
        >
          <CirclePicker
            color={shift.color}
            onChange={handleColorChange}
            colors={ShiftColors}
          />
        </Menu>
      </Box>
    </TableCell>
  );
}
