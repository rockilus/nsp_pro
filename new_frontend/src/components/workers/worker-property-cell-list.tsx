import React, { useState } from "react";
// MUI
import Chip from "@mui/material/Chip";
// Components
import ListTypeCellEdit from "../inputs/list-type-cell-edit";
import PopoverAnchorElOver from "../inputs/popover-anchor-el-over";
// Types
import { WorkerDimensionT, WorkerPropertyT } from "../../types/worker";

export default function WorkerPropertyCellList({
  selectedTeamId,
  workerDimension,
  workerProperty,
  handleUpdateWorkerProperty,
}: {
  selectedTeamId: string;
  workerDimension: WorkerDimensionT;
  workerProperty: WorkerPropertyT;
  handleUpdateWorkerProperty: (
    workerProperty: WorkerPropertyT,
    teamId: string
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<string[]>(
    workerProperty.value as string[]
  );

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddListValue = (value: string) => {
    if (workerDimension.entryType === "list" && Array.isArray(valueState)) {
      const updatedValue = [...valueState, value];
      setValueState(updatedValue);
      if (!selectedTeamId) {
        console.error("No team selected");
        return;
      }
      handleUpdateWorkerProperty(
        {
          ...workerProperty,
          value: updatedValue,
        },
        selectedTeamId
      );
    } else {
      console.error("Cannot add list value to non-list property");
    }
  };

  const handleDeleteListValue = (value: string) => {
    if (workerDimension.entryType === "list" && Array.isArray(valueState)) {
      const updatedValue = valueState.filter((v) => v !== value);
      setValueState(updatedValue);
      if (!selectedTeamId) {
        console.error("No team selected");
        return;
      }
      handleUpdateWorkerProperty(
        {
          ...workerProperty,
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
        Array.isArray(workerProperty.value)
          ? workerProperty.value.map((value, index) => (
              <Chip key={index} label={value} />
            ))
          : workerProperty.value
      }
      content={
        <ListTypeCellEdit
          selectedOptions={valueState}
          options={workerDimension.entryOptions}
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
