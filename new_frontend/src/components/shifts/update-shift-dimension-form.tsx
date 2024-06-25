import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
// Component
import DimensionListInput from "../inputs/dimension-list-input";
import DialogShiftDimensionDel from "./dialog-shift-dimension-del";
// Types
import { ShiftDimensionT } from "../../types/shift";

export default function UpdateShiftDimensionForm({
  lng,
  selectedTeamId,
  shiftDimension,
  setOpenParent,
  handleUpdateShiftDimension,
  handleDeleteShiftDimension,
}: {
  lng: string;
  selectedTeamId: string;
  shiftDimension: ShiftDimensionT;
  setOpenParent: (open: boolean) => void | null;
  handleUpdateShiftDimension: (shiftDimension: ShiftDimensionT) => void;
  handleDeleteShiftDimension: (shiftDimensionId: string) => void;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState<string>(shiftDimension.name);
  const [listOptions, setListOptions] = useState<string[]>(
    shiftDimension.entryOptions
  );
  const [nameError, setNameError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

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
      selectedTeamId
    ) {
      if (
        name !== shiftDimension.name ||
        listOptions !== shiftDimension.entryOptions ||
        updatedOptions
      ) {
        const newShiftDimension: ShiftDimensionT = {
          id: shiftDimension.id,
          isRest: shiftDimension.isRest,
          teamId: selectedTeamId,
          name: name,
          entryType: shiftDimension.entryType,
          entryOptions: updatedOptions ? updatedOptions : listOptions,
        };
        // const addedOK = await handleUpdateShiftDimension(newShiftDimension);
        // if (addedOK && !updatedOptions) {
        await handleUpdateShiftDimension(newShiftDimension);
        if (!updatedOptions) {
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
        <DialogShiftDimensionDel
          lng={lng}
          shiftDimensionId={shiftDimension.id}
          handleDeleteShiftDimension={handleDeleteShiftDimension}
        />
      </div>
    </Box>
  );
}
