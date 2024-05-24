import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
// Component
import DimensionListInput from "../SharedComponents/DimensionListInput";
import DialogShiftDimensionDel from "./DialogShiftDimensionDel";
// Stores
import { useShiftDimensionStore } from "../../stores/shiftDimensionStore";
import { useTeamStore } from "../../stores/teamStore";
// Types
import { ShiftDimensionT } from "./types";
import { use } from "i18next";

interface Props {
  shiftDimension: ShiftDimensionT;
  setOpenParent: (open: boolean) => void | null;
}

export default function UpdateShiftDimensionForm({
  shiftDimension,
  setOpenParent,
}: Props) {
  const { t } = useTranslation();

  const [name, setName] = useState<string>(shiftDimension.name);
  const [listOptions, setListOptions] = useState<string[]>(
    shiftDimension.entryOptions
  );
  const [nameError, setNameError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const updateShiftDimension = useShiftDimensionStore(
    (state) => state.updateShiftDimension
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
    if (shiftDimension.entryType === "list" && listOptions.length === 0) {
      setListError(true);
    } else {
      setListError(false);
    }

    if (
      name.trim() !== "" &&
      shiftDimension.entryType !== "" &&
      (shiftDimension.entryType !== "list" || listOptions.length > 0) &&
      selectedTeam
    ) {
      if (
        name !== shiftDimension.name ||
        listOptions !== shiftDimension.entryOptions ||
        updatedOptions
      ) {
        const newShiftDimension: ShiftDimensionT = {
          id: shiftDimension.id,
          isRest: shiftDimension.isRest,
          teamId: selectedTeam.id,
          name: name,
          entryType: shiftDimension.entryType,
          entryOptions: updatedOptions ? updatedOptions : listOptions,
        };
        const addedOK = await updateShiftDimension(newShiftDimension);
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
        label={t("common.name")}
        variant="outlined"
        value={name}
        onChange={handleNameChange}
        error={nameError}
        helperText={nameError ? t("shift.name_helper_text") : ""}
        onKeyDown={handleKeyPress}
        sx={{ width: "100%" }}
      />
      {shiftDimension.entryType === "list" && (
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
          {t("common.save")}
        </Button>
        <DialogShiftDimensionDel shiftDimensionId={shiftDimension.id} />
      </div>
    </Box>
  );
}
