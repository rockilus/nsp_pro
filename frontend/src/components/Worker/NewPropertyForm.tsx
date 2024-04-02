import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
// Component
import PropertyListInput from "./PropertyListInput";
// Stores
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
import { useTeamStore } from "../../stores/teamStore";
// Types
import { WorkerDimensionT } from "./types";
// Constant
import { PropertyTypes } from "../../utils/constants";

interface Props {
  setOpenParent: (open: boolean) => void | undefined;
}

export default function NewPropertyForm({ setOpenParent }: Props) {
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [listOptions, setListOptions] = useState<string[]>([]);
  const [nameError, setNameError] = useState<boolean>(false);
  const [typeError, setTypeError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const addWorkerDimension = useWorkerDimensionStore(
    (state) => state.addWorkerDimension
  );

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleTypeChange = (event: SelectChangeEvent<string>) => {
    setListOptions([]);
    setType(event.target.value as string);
  };

  const handleAddElement = async () => {
    if (name.trim() === "") {
      setNameError(true);
    } else {
      setNameError(false);
    }
    if (type === "") {
      setTypeError(true);
    } else {
      setTypeError(false);
    }
    if (type === "list" && listOptions.length === 0) {
      setListError(true);
    } else {
      setListError(false);
    }

    if (
      name.trim() !== "" &&
      type !== "" &&
      (type !== "list" || listOptions.length > 0) &&
      selectedTeam
    ) {
      const newWorkerDimension: WorkerDimensionT = {
        id: "",
        teamId: selectedTeam.id,
        name: name,
        entryType: type,
        entryOptions: listOptions,
      };
      const addedOK = await addWorkerDimension(newWorkerDimension);
      if (addedOK) {
        setName("");
        setType("");
        setListOptions([]);
        if (setOpenParent) {
          setOpenParent(false);
        }
      }
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
        sx={{ width: "100%" }}
      />
      <Box mt={2}>
        <FormControl
          variant="outlined"
          style={{ minWidth: 120, width: "100%" }}
        >
          <InputLabel id="demo-simple-select-label">Type</InputLabel>
          <Select
            value={type}
            onChange={handleTypeChange}
            variant="outlined"
            error={typeError}
            style={{ minWidth: 120, width: "100%" }}
            label="Type"
          >
            {Object.keys(PropertyTypes).map((key) => (
              <MenuItem value={key} key={key}>
                {PropertyTypes[key as keyof typeof PropertyTypes]}
              </MenuItem>
            ))}
          </Select>
          {typeError && (
            <FormHelperText error>Please select an option</FormHelperText>
          )}
        </FormControl>
      </Box>
      {type === "list" && (
        <Box mt={2}>
          <PropertyListInput
            options={listOptions}
            listError={listError}
            setOptions={setListOptions}
          />
        </Box>
      )}
      <Button
        variant="contained"
        onClick={handleAddElement}
        style={{ marginTop: 10 }}
      >
        Add
      </Button>
    </Box>
  );
}
