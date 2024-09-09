import React, { useState } from "react";
import { useTranslation } from "../../app/i18n/client";
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
import DimensionListInput from "../inputs/dimension-list-input";
// Types
import { WorkerDimensionT } from "../../types/worker";

export default function NewWorkerDimensionForm({
  lng,
  selectedTeamId,
  setOpenParent,
  handleAddWorkerDimension,
}: {
  lng: string;
  selectedTeamId: string;
  setOpenParent: (open: boolean) => void | null;
  handleAddWorkerDimension: (
    newWorkerDimension: WorkerDimensionT
  ) => Promise<boolean>;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const [name, setName] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [listOptions, setListOptions] = useState<string[]>([]);
  const [nameError, setNameError] = useState<boolean>(false);
  const [typeError, setTypeError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const PropertyTypes: Record<string, string> = {
    str: t("type_str"),
    int: t("type_int"),
    bool: t("type_bool"),
    list: t("type_list"),
  };

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
      selectedTeamId
    ) {
      const newWorkerDimension: WorkerDimensionT = {
        id: "",
        teamId: selectedTeamId,
        name: name,
        entryType: type,
        entryOptions: listOptions,
      };
      const addedOK = await handleAddWorkerDimension(newWorkerDimension);
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
        label={t("name")}
        variant="outlined"
        value={name}
        onChange={handleNameChange}
        error={nameError}
        helperText={nameError ? t("name_helper_text") : ""}
        sx={{ width: "100%" }}
      />
      <Box mt={2}>
        <FormControl
          variant="outlined"
          style={{ minWidth: 120, width: "100%" }}
        >
          <InputLabel id="demo-simple-select-label">
            {t("property_type")}
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
              {t("property_type_helper_text")}
            </FormHelperText>
          )}
        </FormControl>
      </Box>
      {type === "list" && (
        <Box mt={2}>
          <DimensionListInput
            lng={lng}
            options={listOptions}
            listError={listError}
            addOption={handleAddOption}
            removeOption={handleRemoveOption}
          />
        </Box>
      )}
      <div style={{ display: "flex", justifyContent: "right", marginTop: 10 }}>
        <Button variant="contained" onClick={handleAddElement}>
          {t("add")}
        </Button>
      </div>
    </Box>
  );
}
