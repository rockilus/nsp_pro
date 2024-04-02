import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
// Component
import DimensionListInput from "./DimensionListInput";
import DialogWorkerDimensionDel from "./DialogWorkerDimensionDel";
// Stores
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
import { useTeamStore } from "../../stores/teamStore";
// Types
import { WorkerDimensionT } from "./types";

interface Props {
  workerDimension: WorkerDimensionT;
  setOpenParent: (open: boolean) => void | null;
}

export default function UpdateWorkerDimensionForm({
  workerDimension,
  setOpenParent,
}: Props) {
  const [name, setName] = useState<string>(workerDimension.name);
  const [listOptions, setListOptions] = useState<string[]>(
    workerDimension.entryOptions
  );
  const [nameError, setNameError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const updateWorkerDimension = useWorkerDimensionStore(
    (state) => state.updateWorkerDimension
  );

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleAddOption = (newOption: string) => {
    if (newOption.trim() !== "") {
      const updatedOptions = [...listOptions, newOption];
      setListOptions(updatedOptions);
      handleAddElement(updatedOptions);
    } else {
      setListError(true);
    }
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...listOptions];
    updatedOptions.splice(index, 1);
    setListOptions(updatedOptions);
    handleAddElement(updatedOptions);
  };

  const handleAddElement = async (updatedOptions?: string[]) => {
    if (name.trim() === "") {
      setNameError(true);
    } else {
      setNameError(false);
    }
    if (workerDimension.entryType === "list" && listOptions.length === 0) {
      setListError(true);
    } else {
      setListError(false);
    }

    if (
      name.trim() !== "" &&
      workerDimension.entryType !== "" &&
      (workerDimension.entryType !== "list" || listOptions.length > 0) &&
      selectedTeam
    ) {
      if (
        name !== workerDimension.name ||
        listOptions !== workerDimension.entryOptions ||
        updatedOptions
      ) {
        const newWorkerDimension: WorkerDimensionT = {
          id: workerDimension.id,
          teamId: selectedTeam.id,
          name: name,
          entryType: workerDimension.entryType,
          entryOptions: updatedOptions ? updatedOptions : listOptions,
        };
        const addedOK = await updateWorkerDimension(newWorkerDimension);
        if (addedOK && !updatedOptions) {
          setName("");
          setListOptions([]);
          if (setOpenParent) {
            setOpenParent(false);
          }
        }
      } else {
        if (setOpenParent) {
          setOpenParent(false);
        }
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleAddElement();
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <TextField
        label="Name"
        variant="outlined"
        value={name}
        onChange={handleNameChange}
        error={nameError}
        helperText={nameError ? "Please enter a name" : ""}
        onKeyDown={handleKeyPress}
        sx={{ width: "100%" }}
      />
      {workerDimension.entryType === "list" && (
        <Box mt={2}>
          <DimensionListInput
            options={listOptions}
            listError={listError}
            addOption={handleAddOption}
            removeOption={handleRemoveOption}
          />
        </Box>
      )}
      <div style={{ display: "flex", justifyContent: "right", marginTop: 2 }}>
        <Button
          variant="contained"
          onClick={() => handleAddElement()}
          sx={{ marginRight: 1 }}
        >
          Save
        </Button>
        <DialogWorkerDimensionDel workerDimensionId={workerDimension.id} />
      </div>
    </Box>
  );
}
