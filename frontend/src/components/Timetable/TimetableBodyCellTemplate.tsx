import React, { useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TableCell from "@mui/material/TableCell";
import Typography from "@mui/material/Typography";

import BasicSelect from "../Utils/BasicSelect";

interface Props {
  cellInfo: Record<string, any>;
  handleAddCell: (
    value: string,
    timetableId: string,
    timetableCategoryId: string,
    timetableTimeId: string
  ) => void;
  handleUpdateCell: (timetablePropertyId: string, value: string) => void;
  handleDeleteCell: (timetablePropertyId: string) => void;
}

export default function TimetableBodyCellTemplate({
  cellInfo,
  handleAddCell,
  handleUpdateCell,
  handleDeleteCell,
}: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [entryValue, setEntryValue] = useState(cellInfo?.value || "");

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

  const handleAddCellConfirm = async () => {
    await handleAddCell(
      entryValue,
      cellInfo.timetable,
      cellInfo.timetable_category,
      cellInfo.timetable_time
    );
    handleClose();
  };

  const handleUpdateCellConfirm = async () => {
    await handleUpdateCell(cellInfo._id, entryValue);
    handleClose();
  };

  const handleDeleteCellConfirm = async () => {
    await handleDeleteCell(cellInfo._id);
    handleClose();
  };

  return (
    <TableCell
      key={cellInfo._id}
      component="th"
      scope="row"
      rowSpan={cellInfo?.rowSpan || 1}
      // onClick={() => setEditing({ [rowId]: columnId })}
    >
      <Box sx={{ minWidth: 120, width: "100%" }}>
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
          {cellInfo._id === "addPropertyRow" ? (
            <AddIcon />
          ) : (
            <Typography variant="body2" color="text.secondary" align="left">
              {cellInfo?.label || cellInfo?.value || ""}
            </Typography>
          )}
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
            {cellInfo._id === "addPropertyRow" ? (
              <Button
                variant="outlined"
                onClick={handleAddCellConfirm}
                style={{ textTransform: "none", justifyContent: "flex-start" }}
              >
                Add Property
              </Button>
            ) : (
              <Box sx={{ display: "flex" }}>
                <Button
                  variant="outlined"
                  onClick={handleUpdateCellConfirm}
                  style={{
                    textTransform: "none",
                    justifyContent: "flex-start",
                  }}
                >
                  Update
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleDeleteCellConfirm}
                  style={{
                    textTransform: "none",
                    justifyContent: "flex-start",
                  }}
                >
                  Delete
                </Button>
              </Box>
            )}
          </MenuItem>
        </Menu>
      </Box>
    </TableCell>
  );
}

{
  /* <>
  <TableCell
    key={cellInfo._id}
    component="th"
    scope="row"
    rowSpan={cellInfo?.rowSpan || 1}
    // onClick={() => setEditing({ [rowId]: columnId })}
  >
    {cellInfo._id === "addPropertyRow" ? (
      <TimetableAddCellTemplate
        cellInfo={cellInfo}
        handleAddCell={handleAddCell}
      />
    ) : (
      <Typography variant="body2" color="text.secondary" align="left">
        {cellInfo?.label || cellInfo?.value || ""}
      </Typography>
    )}
  </TableCell>
</>; */
}
