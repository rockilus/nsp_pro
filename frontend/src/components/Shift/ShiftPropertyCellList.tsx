import React, { useState } from "react";
// MUI
import Chip from "@mui/material/Chip";
// Components
import ListTypeCellEdit from "../../utils/WorkerShiftUtils/ListTypeCellEdit";
import PopoverAnchorElOver from "../../utils/PopoverAnchorElOver";
// Stores
import { useShiftStore } from "../../stores/shiftStore";
import { useTeamStore } from "../../stores/teamStore";
// Types
import { ShiftDimensionT, ShiftPropertyT } from "./types";

interface Props {
  shiftDimension: ShiftDimensionT;
  shiftProperty: ShiftPropertyT;
}

export default function ShiftPropertyCellList({
  shiftDimension,
  shiftProperty,
}: Props) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<string[]>(
    shiftProperty.value as string[]
  );

  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const updateShiftProperty = useShiftStore(
    (state) => state.updateShiftProperty
  );

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddListValue = (value: string) => {
    if (shiftDimension.entryType === "list" && Array.isArray(valueState)) {
      const updatedValue = [...valueState, value];
      setValueState(updatedValue);
      if (!selectedTeam) {
        console.error("No team selected");
        return;
      }
      updateShiftProperty(selectedTeam.id, {
        ...shiftProperty,
        value: updatedValue,
      });
    } else {
      console.error("Cannot add list value to non-list property");
    }
  };

  const handleDeleteListValue = (value: string) => {
    if (shiftDimension.entryType === "list" && Array.isArray(valueState)) {
      const updatedValue = valueState.filter((v) => v !== value);
      setValueState(updatedValue);
      if (!selectedTeam) {
        console.error("No team selected");
        return;
      }
      updateShiftProperty(selectedTeam.id, {
        ...shiftProperty,
        value: updatedValue,
      });
    } else {
      console.error("Cannot remove list value from non-list property");
    }
  };

  return (
    <PopoverAnchorElOver
      buttonContent={
        Array.isArray(shiftProperty.value)
          ? shiftProperty.value.map((value, index) => (
              <Chip key={index} label={value} />
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
