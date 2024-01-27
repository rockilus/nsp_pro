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

import UpdateShiftDimension from "./UpdateShiftDimension";
import { ShiftDimensionT } from "./types";
import { useShiftDimensionStore } from "../../stores/shiftDimensionStore";

interface Props {
  shiftDimension: ShiftDimensionT;
}

export default function ShiftDimensionCell({ shiftDimension }: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [nameState, setNameState] = useState(shiftDimension.name);
  const [entryOptionsState, setEntryOptionsState] = useState(
    shiftDimension.entryOptions
  );

  const updateShiftDimension = useShiftDimensionStore(
    (state) => state.updateShiftDimension
  );

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
    if (
      nameState !== shiftDimension.name ||
      entryOptionsState !== shiftDimension.entryOptions
    ) {
      const updatedSD: ShiftDimensionT = {
        id: shiftDimension.id,
        name: nameState,
        entryType: shiftDimension.entryType,
        entryOptions: entryOptionsState,
      };
      await updateShiftDimension(updatedSD);
    }
    setNameState(shiftDimension.name);
    setEntryOptionsState(shiftDimension.entryOptions);
    handleClose();
  };

  const handleEditCancel = () => {
    setNameState(shiftDimension.name);
    setEntryOptionsState(shiftDimension.entryOptions);
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
        {shiftDimension.name}
      </Typography>
      {iconsPrefix[shiftDimension.entryType]}
    </Box>
  );

  return (
    <TableCell key={shiftDimension.id} component="th" scope="row">
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
        <UpdateShiftDimension
          shiftDimensionId={shiftDimension.id}
          name={nameState}
          entryType={shiftDimension.entryType}
          entryOptions={entryOptionsState}
          setNameState={setNameState}
          setEntryOptions={setEntryOptionsState}
        />
      </Menu>
    </TableCell>
  );
}
