import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
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
import NewDimensionDimEntriesInput from "./new-dimension-dim-entries-input";
import LinkDimensionList from "./link-dimension-list";
// Styles
import "../../../styles/tab-container-styles.css";
// Types
import { DimensionType } from "@/types/dimension";
import { DimensionEntryType } from "@/types/dimension";
import { DimEntryT } from "@/types/dim-entry";
import { DimensionT } from "@/types/dimension";

export default function NewDimensionForm({
  lng,
  selectedTeamId,
  dimensionType,
  dimensions,
  dimEntries,
  setOpenParent,
  handleAddDimension,
  handleUpdateDimension,
}: {
  lng: string;
  selectedTeamId: string;
  dimensionType: DimensionType;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  setOpenParent: (open: boolean) => void | null;
  handleAddDimension: (
    newDimension: DimensionT,
    newDimEntries: DimEntryT[]
  ) => Promise<boolean>;
  handleUpdateDimension: (dimension: DimensionT) => void;
}) {
  const { t } = useTranslation(lng, "shift-page");

  const [name, setName] = useState<string>("");
  const [entryType, setEntryType] = useState<DimensionEntryType | null>(null);
  const [dimEntriesNewDim, setDimEntriesNewDim] = useState<DimEntryT[]>([]);
  const [nameError, setNameError] = useState<boolean>(false);
  const [entryTypeError, setEntryTypeError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const dimensionEntryTypeOptions: {
    value: DimensionEntryType;
    label: string;
  }[] = [
    { value: DimensionEntryType.STR, label: t("type_str") },
    { value: DimensionEntryType.INT, label: t("type_int") },
    { value: DimensionEntryType.BOOL, label: t("type_bool") },
    { value: DimensionEntryType.DIM_ENTRIES, label: t("type_list") },
  ];

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleTypeChange = (event: SelectChangeEvent<DimensionEntryType>) => {
    setDimEntriesNewDim([]);
    setEntryType(event.target.value as DimensionEntryType);
  };

  const handleAddDimEntry = (newDimEntry: DimEntryT) => {
    if (newDimEntry.name.trim() !== "") {
      setDimEntriesNewDim([...dimEntriesNewDim, newDimEntry]);
      setListError(false);
    } else {
      setListError(true);
    }
  };

  const handleRemoveDimEntry = (index: number) => {
    const updatedOptions = [...dimEntriesNewDim];
    updatedOptions.splice(index, 1);
    setDimEntriesNewDim(updatedOptions);
  };

  const handleAddElement = async () => {
    if (name.trim() === "") {
      setNameError(true);
    } else {
      setNameError(false);
    }
    if (entryType === null) {
      setEntryTypeError(true);
    } else {
      setEntryTypeError(false);
    }
    if (
      entryType === DimensionEntryType.DIM_ENTRIES &&
      dimEntriesNewDim.length === 0
    ) {
      setListError(true);
    } else {
      setListError(false);
    }

    if (
      name.trim() !== "" &&
      entryType !== null &&
      (entryType !== DimensionEntryType.DIM_ENTRIES ||
        dimEntriesNewDim.length > 0) &&
      selectedTeamId
    ) {
      const newDimension: DimensionT = {
        id: "",
        teamId: selectedTeamId,
        dimTypes: [dimensionType],
        name: name,
        entryType: entryType,
        deleted: false,
      };
      const addedOK = await handleAddDimension(newDimension, dimEntriesNewDim);
      if (addedOK) {
        setName("");
        setEntryType(null);
        setDimEntriesNewDim([]);
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
            value={entryType ? entryType : ""}
            onChange={handleTypeChange}
            variant="outlined"
            error={entryTypeError}
            style={{ minWidth: 120, width: "100%" }}
            label={t("property_type")}
          >
            {dimensionEntryTypeOptions.map((option, index) => (
              <MenuItem key={index} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {entryTypeError && (
            <FormHelperText error>
              {t("property_type_helper_text")}
            </FormHelperText>
          )}
        </FormControl>
      </Box>
      {entryType === DimensionEntryType.DIM_ENTRIES && (
        <Box mt={2}>
          <NewDimensionDimEntriesInput
            lng={lng}
            dimEntries={dimEntriesNewDim}
            listError={listError}
            addDimEntry={handleAddDimEntry}
            removeDimEntry={handleRemoveDimEntry}
          />
        </Box>
      )}
      <div style={{ display: "flex", justifyContent: "right", marginTop: 10 }}>
        <Button variant="contained" onClick={handleAddElement}>
          {t("add")}
        </Button>
      </div>
      <div className="divider" />
      <LinkDimensionList
        lng={lng}
        dimensionType={dimensionType}
        dimensions={dimensions}
        dimEntries={dimEntries}
        setOpenParent={setOpenParent}
        handleUpdateDimension={handleUpdateDimension}
      />
    </Box>
  );
}
