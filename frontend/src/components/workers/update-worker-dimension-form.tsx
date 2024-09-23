import React, { useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
// Component
import DimensionListInput from "../inputs/dimension-list-input";
import DialogWorkerDimensionDel from "./dialog-worker-dimension-del";
// Types
import { WorkerDimensionT } from "../../types/worker";

export default function UpdateWorkerDimensionForm({
  lng,
  selectedTeamId,
  workerDimension,
  setOpenParent,
  handleUpdateWorkerDimension,
  handleDeleteWorkerDimension,
}: {
  lng: string;
  selectedTeamId: string;
  workerDimension: WorkerDimensionT;
  setOpenParent: (open: boolean) => void | null;
  handleUpdateWorkerDimension: (workerDimension: WorkerDimensionT) => void;
  handleDeleteWorkerDimension: (workerDimensionId: string) => void;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const [name, setName] = useState<string>(workerDimension.name);
  const [listOptions, setListOptions] = useState<string[]>(
    workerDimension.entryOptions
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
    if (workerDimension.entryType === "list" && listOptions.length === 0) {
      setListError(true);
    } else {
      setListError(false);
    }

    if (
      name.trim() !== "" &&
      workerDimension.entryType !== "" &&
      (workerDimension.entryType !== "list" || listOptions.length > 0) &&
      selectedTeamId
    ) {
      if (
        name !== workerDimension.name ||
        listOptions !== workerDimension.entryOptions ||
        updatedOptions
      ) {
        const newWorkerDimension: WorkerDimensionT = {
          id: workerDimension.id,
          teamId: selectedTeamId,
          name: name,
          entryType: workerDimension.entryType,
          entryOptions: updatedOptions ? updatedOptions : listOptions,
          deleted: false,
        };
        // const addedOK = await handleUpdateWorkerDimension(newWorkerDimension);
        // if (addedOK && !updatedOptions) {
        await handleUpdateWorkerDimension(newWorkerDimension);
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
        label={t("name")}
        variant="outlined"
        value={name}
        onChange={handleNameChange}
        error={nameError}
        helperText={nameError ? t("name_helper_text") : ""}
        onKeyDown={handleKeyPress}
        sx={{ width: "100%" }}
      />
      {workerDimension.entryType === "list" && (
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
      <div style={{ display: "flex", justifyContent: "right", marginTop: 2 }}>
        <Button
          variant="contained"
          onClick={() => handleAddElement()}
          sx={{ marginRight: 1 }}
        >
          {t("save")}
        </Button>
        <DialogWorkerDimensionDel
          lng={lng}
          workerDimensionId={workerDimension.id}
          handleDeleteWorkerDimension={handleDeleteWorkerDimension}
        />
      </div>
    </Box>
  );
}
