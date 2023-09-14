import React, { useState } from "react";

import AbcIcon from "@mui/icons-material/Abc";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ListIcon from "@mui/icons-material/List";
import Menu from "@mui/material/Menu";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
import Typography from "@mui/material/Typography";

import TimetableEditColumnTemplate from "./TimetableEditColumnTemplate";

interface Props {
  columnId: string;
  value: any;
  entryType: string;
  entryOptions: string[];
  handleEditCell: (
    columnId: string,
    value: string,
    entryType: string,
    entryOptions: string[]
  ) => void;
  handleDeleteColumn: (columnId: string) => void;
}

export default function TimetableHeadCellTemplate({
  columnId,
  value,
  entryType,
  entryOptions,
  handleEditCell,
  handleDeleteColumn,
}: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [entryValue, setEntryValue] = useState(value);
  const [entryTypeState, setEntryTypeState] = useState(entryType);
  const [entryOptionsState, setEntryOptionsState] = useState(entryOptions);

  const open = Boolean(anchorEl);

  const iconsPrefix: Record<string, React.ReactNode> = {
    str: <AbcIcon color="disabled" fontSize="small" />,
    int: <NumbersIcon color="disabled" fontSize="small" />,
    bool: <CheckBoxIcon color="disabled" fontSize="small" />,
    list: <ListIcon color="disabled" fontSize="small" />,
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEditConfirm = async () => {
    console.log("handleEdit: ", columnId);
    if (
      entryValue !== value ||
      entryTypeState !== entryType ||
      entryOptionsState !== entryOptions
    ) {
      await handleEditCell(
        columnId,
        entryValue,
        entryTypeState,
        entryOptionsState
      );
    }
    setEntryValue(value);
    setEntryTypeState(entryType);
    setEntryOptionsState(entryOptions);
    handleClose();
  };

  const handleEditCancel = () => {
    console.log("handleEditCancel");

    setEntryValue(value);
    setEntryTypeState(entryType);
    setEntryOptionsState(entryOptions);
    handleClose();
  };

  const cellContent = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography variant="body2" color="text.secondary" align="left">
        {value}
      </Typography>
      {iconsPrefix[entryType]}
    </Box>
  );

  return (
    <TableCell key={columnId} component="th" scope="row">
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
        {cellContent()}
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleEditCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleEditConfirm();
          }
        }}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <TimetableEditColumnTemplate
          columnId={columnId}
          value={entryValue}
          entryType={entryTypeState}
          entryOptions={entryOptionsState}
          setEntryValue={setEntryValue}
          setEntryType={setEntryTypeState}
          setEntryOptions={setEntryOptionsState}
          handleDeleteColumn={handleDeleteColumn}
        />
      </Menu>
    </TableCell>
  );
}
