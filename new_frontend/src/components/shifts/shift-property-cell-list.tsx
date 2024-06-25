import React, { useState } from "react";
// MUI
import Chip from "@mui/material/Chip";
// Components
import ListTypeCellEdit from "../inputs/list-type-cell-edit";
import PopoverAnchorElOver from "../inputs/popover-anchor-el-over";
// Types
import { ShiftDimensionT, ShiftPropertyT } from "../../types/shift";

export default function ShiftPropertyCellList({
  selectedTeamId,
  shiftDimension,
  shiftProperty,
  handleUpdateShiftProperty,
}: {
  selectedTeamId: string;
  shiftDimension: ShiftDimensionT;
  shiftProperty: ShiftPropertyT;
  handleUpdateShiftProperty: (
    shiftProperty: ShiftPropertyT,
    teamId: string
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<string[]>(
    shiftProperty.value as string[]
  );

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddListValue = (value: string) => {
    if (shiftDimension.entryType === "list" && Array.isArray(valueState)) {
      const updatedValue = [...valueState, value];
      setValueState(updatedValue);
      if (!selectedTeamId) {
        console.error("No team selected");
        return;
      }
      handleUpdateShiftProperty(
        {
          ...shiftProperty,
          value: updatedValue,
        },
        selectedTeamId
      );
    } else {
      console.error("Cannot add list value to non-list property");
    }
  };

  const handleDeleteListValue = (value: string) => {
    if (shiftDimension.entryType === "list" && Array.isArray(valueState)) {
      const updatedValue = valueState.filter((v) => v !== value);
      setValueState(updatedValue);
      if (!selectedTeamId) {
        console.error("No team selected");
        return;
      }
      handleUpdateShiftProperty(
        {
          ...shiftProperty,
          value: updatedValue,
        },
        selectedTeamId
      );
    } else {
      console.error("Cannot remove list value from non-list property");
    }
  };

  return (
    <PopoverAnchorElOver
      buttonContent={
        Array.isArray(shiftProperty.value)
          ? shiftProperty.value.map((value, index) => (
              <Chip key={index} label={value} sx={{ cursor: "pointer" }} />
            ))
          : shiftProperty.value
      }
      content={
        <ListTypeCellEdit
          selectedOptions={valueState}
          options={shiftDimension.entryOptions}
          handleAddListValue={handleAddListValue}
          handleDeleteListValue={handleDeleteListValue}
          handleClose={handleClose}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
