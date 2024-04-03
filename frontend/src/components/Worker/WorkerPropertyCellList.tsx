import React, { useState } from "react";
// MUI
import Chip from "@mui/material/Chip";
// Components
import ListTypeCellEdit from "./ListTypeCellEdit";
import PopoverAnchorElOver from "../../utils/PopoverAnchorElOver";
// Stores
import { useWorkerStore } from "../../stores/workerStore";
import { useTeamStore } from "../../stores/teamStore";
// Types
import { WorkerDimensionT, WorkerPropertyT } from "./types";

interface Props {
  workerDimension: WorkerDimensionT;
  workerProperty: WorkerPropertyT;
}

export default function WorkerPropertyCellList({
  workerDimension,
  workerProperty,
}: Props) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<string[]>(
    workerProperty.value as string[]
  );

  const updateWorkerProperty = useWorkerStore(
    (state) => state.updateWorkerProperty
  );
  const selectedTeam = useTeamStore((state) => state.selectedTeam);

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddListValue = (value: string) => {
    if (workerDimension.entryType === "list" && Array.isArray(valueState)) {
      const updatedValue = [...valueState, value];
      setValueState(updatedValue);
      if (!selectedTeam) {
        console.error("No team selected");
        return;
      }
      updateWorkerProperty(selectedTeam.id, {
        ...workerProperty,
        value: updatedValue,
      });
    } else {
      console.error("Cannot add list value to non-list property");
    }
  };

  const handleDeleteListValue = (value: string) => {
    if (workerDimension.entryType === "list" && Array.isArray(valueState)) {
      const updatedValue = valueState.filter((v) => v !== value);
      setValueState(updatedValue);
      if (!selectedTeam) {
        console.error("No team selected");
        return;
      }
      updateWorkerProperty(selectedTeam.id, {
        ...workerProperty,
        value: updatedValue,
      });
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
