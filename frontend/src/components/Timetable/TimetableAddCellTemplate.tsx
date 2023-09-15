import React, { useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TableCell from "@mui/material/TableCell";

import BasicSelect from "../Utils/BasicSelect";

interface Props {
  cellInfo: Record<string, any>;
  handleAddCell: (
    value: string,
    timetableId: string,
    timetableCategoryId: string,
    timetableTimeId: string
  ) => void;
}

export default function TimetableAddCellTemplate({
  cellInfo,
  handleAddCell,
}: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [entryValue, setEntryValue] = useState("");

  const entryOptions = [1, 2, 3];

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEditCancel = () => {
    setEntryValue("");
    handleClose();
  };

  const handleAddCellConfirm = () => {
    handleAddCell(
      entryValue,
      cellInfo.timetable,
      cellInfo.timetable_category,
      cellInfo.timetable_time
    );
    handleClose();
  };

  return (
    <TableCell key={cellInfo.timetable_time} component="th" scope="row">
      <Button
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        style={{
          textTransform: "none",
          justifyContent: "flex-start",
          padding: 0,
        }}
        onClick={handleClick}
      >
        <AddIcon />
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleEditCancel}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MenuItem>
          <BasicSelect
            label="Select Shift"
            options={entryOptions}
            value={entryValue}
            setValue={setEntryValue}
          />
        </MenuItem>
        <MenuItem>
          <Button
            variant="outlined"
            onClick={handleAddCellConfirm}
            style={{ textTransform: "none", justifyContent: "flex-start" }}
          >
            Add Property
          </Button>
        </MenuItem>
      </Menu>
    </TableCell>
  );
}
