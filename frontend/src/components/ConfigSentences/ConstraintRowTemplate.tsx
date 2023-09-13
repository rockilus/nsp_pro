import React, { useState } from "react";

import AbcIcon from "@mui/icons-material/Abc";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import DeleteIcon from "@mui/icons-material/Delete";
import ListIcon from "@mui/icons-material/List";
import Menu from "@mui/material/Menu";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import BuildConstraint from "./BuildContraint";

interface Props {
  constraintParams: Record<string, any>;
  row: Record<string, any>;
  handleEditRow: (rowId: string, constraint: Record<string, any>) => void;
  handleEditRowStatus: (rowId: string, active: boolean) => void;
  handleDeleteRow: (rowId: string) => void;
}

export default function ConstraintRowTemplate({
  constraintParams,
  row,
  handleEditRow,
  handleEditRowStatus,
  handleDeleteRow,
}: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [entryValue, setEntryValue] = useState("value");
  const [entryTypeState, setEntryTypeState] = useState("entryType");
  const [entryOptionsState, setEntryOptionsState] = useState("entryOptions");

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

  const handleEditConfirm = async (
    rowId: string,
    constraint: Record<string, any>
  ) => {
    await handleEditRow(rowId, constraint);
    handleClose();
  };

  return (
    <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
      <TableCell component="th" scope="row" sx={{ maxWidth: 0 }}>
        <Checkbox
          checked={row.active}
          onChange={() => handleEditRowStatus(row._id, !row.active)}
        />
      </TableCell>
      <TableCell component="th" scope="row">
        <Button
          id="basic-button"
          aria-controls={open ? "basic-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          style={{
            textTransform: "none",
            justifyContent: "flex-start",
            padding: 0,
            color: "black",
          }}
          onClick={handleClick}
        >
          {row.constraint_string}
        </Button>
        <Menu
          id="basic-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            "aria-labelledby": "basic-button",
          }}
        >
          <BuildConstraint
            constraintParams={constraintParams}
            constraint={row}
            handleAddRow={() => {}}
            handleEditRow={handleEditConfirm}
            editMode={true}
          />
        </Menu>
      </TableCell>
      <TableCell component="th" scope="row">
        <Typography variant="body2" color="text.secondary">
          {row.constraint.soft_or_hard +
            (row.constraint.soft_or_hard === "soft"
              ? " (" + row.constraint.soft_priority + ")"
              : "")}
        </Typography>
      </TableCell>
      <TableCell component="th" scope="row" align="right">
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => handleDeleteRow(row._id)}>
            <DeleteIcon />
          </Button>
        </Box>
      </TableCell>
    </TableRow>

    // <TableCell key={columnId} component="th" scope="row">
    //   <Button
    //     id="basic-button"
    //     aria-controls={open ? "basic-menu" : undefined}
    //     aria-haspopup="true"
    //     aria-expanded={open ? "true" : undefined}
    //     style={{
    //       textTransform: "none",
    //       justifyContent: "flex-start",
    //       padding: 0,
    //     }}
    //     onClick={handleClick}
    //   >
    //     {cellContent()}
    //   </Button>
    //   <Menu
    //     id="basic-menu"
    //     anchorEl={anchorEl}
    //     open={open}
    //     onClose={handleEditCancel}
    //     onKeyDown={(e) => {
    //       if (e.key === "Enter") {
    //         handleEditConfirm();
    //       }
    //     }}
    //     MenuListProps={{
    //       "aria-labelledby": "basic-button",
    //     }}
    //   >
    //     <BuildConstraint
    //       constraintParams={constraintParams}
    //       constraint={constraint}
    //       handleAddRow={() => {}}
    //       handleEditRow={handleEditConfirm}
    //       editMode={true}
    //     />
    //   </Menu>
    // </TableCell>
  );
}
