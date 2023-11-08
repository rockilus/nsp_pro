import React, { useCallback, useEffect, useState } from "react";

import AbcIcon from "@mui/icons-material/Abc";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ListIcon from "@mui/icons-material/List";
import Menu from "@mui/material/Menu";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
import Typography from "@mui/material/Typography";

import UpdateColumnHeader from "./UpdateColumnHeader";
import { ColumnT } from "./types";

interface Props {
  column: ColumnT;
  handleEditCell: (updatedColumn: ColumnT) => void;
  handleDeleteColumn: (columnId: string) => void;
}

export default function HeadCell({
  column,
  handleEditCell,
  handleDeleteColumn,
}: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [nameState, setNameState] = useState(column.name);
  const [entryTypeState, setEntryTypeState] = useState(column.entryType);
  const [entryOptionsState, setEntryOptionsState] = useState(
    column.entryOptions
  );

  const handleEditConfirm  = useCallback(async () => {
    if (
      nameState !== column.name ||
      entryTypeState !== column.entryType ||
      !entryOptionsState.every((val, index) => val === column.entryOptions[index]) // hotfix for array content comparison
    ) {
      const updatedColumn: ColumnT = {
        id: column.id,
        name: nameState,
        entryType: entryTypeState,
        entryOptions: entryOptionsState,
        defaultColumn: column.defaultColumn,
      };
      await handleEditCell(updatedColumn);
      setNameState(column.name);
      setEntryTypeState(column.entryType);
      setEntryOptionsState(column.entryOptions);
      handleClose();
    }
  }, [nameState, entryTypeState, entryOptionsState, column, handleEditCell]);


  useEffect(() => {
    handleEditConfirm()
  }, [entryOptionsState, handleEditConfirm]);

  const open = Boolean(anchorEl);

  const iconsPrefix: Record<string, React.ReactNode> = {
    str: <AbcIcon color="disabled" fontSize="small" />,
    int: <NumbersIcon color="disabled" fontSize="small" />,
    bool: <CheckBoxIcon color="disabled" fontSize="small" />,
    list: <ListIcon color="disabled" fontSize="small" />,
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!column.defaultColumn) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };


  const handleEditCancel = () => {
    setNameState(column.name);
    setEntryTypeState(column.entryType);
    setEntryOptionsState(column.entryOptions);
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
        {column.name}
      </Typography>
      {iconsPrefix[column.entryType]}
    </Box>
  );

  return (
    <TableCell key={column.id} component="th" scope="row">
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
        slotProps={{ 
          paper: { 
            sx: { padding: 2 },
          } 
        }}
      >
        <UpdateColumnHeader
          columnId={column.id}
          name={nameState}
          entryType={entryTypeState}
          entryOptions={entryOptionsState}
          setNameState={setNameState}
          setEntryType={setEntryTypeState}
          setEntryOptions={setEntryOptionsState}
          handleDeleteColumn={handleDeleteColumn}
        />
      </Menu>
    </TableCell>
  );
}
