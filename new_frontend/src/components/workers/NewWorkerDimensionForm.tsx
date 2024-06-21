import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
import DimensionListInput from "../SharedComponents/DimensionListInput";
// Stores
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
import { useTeamStore } from "../../stores/teamStore";
// Types
import { WorkerDimensionT } from "../../types/worker";

interface Props {
  setOpenParent: (open: boolean) => void | null;
}

export default function NewWorkerDimensionForm({ setOpenParent }: Props) {
  const { t } = useTranslation();

  const [name, setName] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [listOptions, setListOptions] = useState<string[]>([]);
  const [nameError, setNameError] = useState<boolean>(false);
  const [typeError, setTypeError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const PropertyTypes: Record<string, string> = {
    str: t("worker_shift.type_str"),
    int: t("worker_shift.type_int"),
    bool: t("worker_shift.type_bool"),
    list: t("worker_shift.type_list"),
  };

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

  const handleAddOption = (newOption: string) => {
    if (newOption.trim() !== "") {
      setListOptions([...listOptions, newOption]);
      setListError(false);
    } else {
      setListError(true);
    }
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...listOptions];
    updatedOptions.splice(index, 1);
    setListOptions(updatedOptions);
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
        label={t("common.name")}
        variant="outlined"
        value={name}
        onChange={handleNameChange}
        error={nameError}
        helperText={nameError ? t("worker.name_helper_text") : ""}
        sx={{ width: "100%" }}
      />
      <Box mt={2}>
        <FormControl
          variant="outlined"
          style={{ minWidth: 120, width: "100%" }}
        >
          <InputLabel id="demo-simple-select-label">
            {t("worker_shift.property_type")}
          </InputLabel>
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
            <FormHelperText error>
              {t("worker_shift.property_type_helper_text")}
            </FormHelperText>
          )}
        </FormControl>
      </Box>
      {type === "list" && (
        <Box mt={2}>
          <DimensionListInput
            options={listOptions}
            listError={listError}
            addOption={handleAddOption}
            removeOption={handleRemoveOption}
          />
        </Box>
      )}
      <div style={{ display: "flex", justifyContent: "right", marginTop: 10 }}>
        <Button variant="contained" onClick={handleAddElement}>
          {t("common.add")}
        </Button>
      </div>
    </Box>
  );
}
