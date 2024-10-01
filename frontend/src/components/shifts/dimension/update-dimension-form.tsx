import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
// Component
import UpdateDimensionDimEntriesInput from "./update-dimension-dim-entries-input";
import DialogShiftDimensionDel from "../dialog-shift-dimension-del";
// Types
import {
  DimensionT,
  DimEntryT,
  DimensionEntryType,
} from "../../../types/shift";

export default function UpdateDimensionForm({
  lng,
  selectedTeamId,
  dimension: dimension,
  dimEntries,
  setOpenParent,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
}: {
  lng: string;
  selectedTeamId: string;
  dimension: DimensionT;
  dimEntries: DimEntryT[];
  setOpenParent: (open: boolean) => void | null;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (DimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
}) {
  const { t } = useTranslation(lng, "shift-page");

  const [name, setName] = useState<string>(dimension.name);
  const [nameError, setNameError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleUpdateDimensionName = async () => {
    if (name.trim() === "") {
      setNameError(true);
    } else {
      setNameError(false);
    }
    if (
      dimension.entryType === DimensionEntryType.DIM_ENTRIES &&
      dimEntries.length === 0
    ) {
      setListError(true);
    } else {
      setListError(false);
    }

    if (
      name.trim() !== "" &&
      (dimension.entryType !== DimensionEntryType.DIM_ENTRIES ||
        dimEntries.length > 0) &&
      selectedTeamId
    ) {
      if (name !== dimension.name) {
        const newShiftDimension: DimensionT = { ...dimension, name: name };
        await handleUpdateDimension(newShiftDimension);
      } else {
        if (setOpenParent) {
          setOpenParent(false);
        }
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleUpdateDimensionName();
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
        onKeyDown={handleKeyPress}
        sx={{ width: "100%" }}
      />
      {dimension.entryType === DimensionEntryType.DIM_ENTRIES && (
        <Box mt={2}>
          <UpdateDimensionDimEntriesInput
            lng={lng}
            dimEntries={dimEntries}
            dimensionId={dimension.id}
            listError={listError}
            createDimEntry={handleAddDimEntry}
            updateDimEntry={handleUpdateDimEntry}
            deleteDimEntry={handleDeleteDimEntry}
          />
        </Box>
      )}
      <div style={{ display: "flex", justifyContent: "right", marginTop: 2 }}>
        <Button
          variant="contained"
          onClick={() => handleUpdateDimensionName()}
          sx={{ marginRight: 1 }}
        >
          {t("save")}
        </Button>
        <DialogShiftDimensionDel
          lng={lng}
          shiftDimensionId={dimension.id}
          handleDeleteShiftDimension={handleDeleteDimension}
        />
      </div>
    </Box>
  );
}
