import React, { useState } from "react";
import { CirclePicker, ColorResult } from "react-color";

import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import TableCell from "@mui/material/TableCell";

import { ShiftT } from "./types";
import { useShiftStore } from "../../stores/shiftStore";
import { ShiftColors } from "../../utils/constants";

interface Props {
  shift: ShiftT;
}

export default function ShiftFieldCellColor({ shift }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const updateShift = useShiftStore((state) => state.updateShift);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleColorChange = (newColor: ColorResult) => {
    if (newColor.hex !== shift.color) {
      updateShift({ ...shift, color: newColor.hex });
    }
    handleClose();
  };

  return (
    <TableCell component="th" scope="row" sx={{ width: 30 }}>
      <Box style={{ width: "100%" }}>
        <Box
          onClick={handleClick}
          sx={{ display: "inline-flex", minWidth: 0, cursor: "pointer" }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: shift.color,
            }}
          ></div>
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
