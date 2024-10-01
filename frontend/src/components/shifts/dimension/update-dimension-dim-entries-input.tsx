import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
// Types
import { DimEntryT } from "../../../types/shift";

export default function UpdateDimensionDimEntriesInput({
  lng,
  dimEntries,
  dimensionId,
  listError,
  createDimEntry,
  updateDimEntry,
  deleteDimEntry,
}: {
  lng: string;
  dimEntries: DimEntryT[];
  dimensionId: string;
  listError: boolean;
  createDimEntry: (newDimEntry: DimEntryT) => void;
  updateDimEntry: (dimEntry: DimEntryT) => void;
  deleteDimEntry: (dimEntryId: string) => void;
}) {
  const { t } = useTranslation(lng, "inputs-components");

  const [newDimEntry, setNewDimEntry] = useState<DimEntryT>({
    id: "",
    dimensionId: dimensionId,
    name: "",
    deleted: false,
  });
  const [DimEntryEditing, setDimEntryEditing] = useState<DimEntryT | null>(
    null
  );
  const [error, setError] = useState<boolean>(false);
  const [errorEditing, setErrorEditing] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewDimEntry({ ...newDimEntry, name: event.target.value });
  };

  const handleAddOption = () => {
    if (newDimEntry.name.trim() !== "") {
      createDimEntry(newDimEntry);
      setNewDimEntry({
        id: "",
        dimensionId: dimensionId,
        name: "",
        deleted: false,
      });
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleAddOption();
    }
  };

  const handleEditDimEntry = () => {
    if (DimEntryEditing) {
      if (DimEntryEditing.name.trim() === "") {
        setErrorEditing(true);
      } else {
        updateDimEntry(DimEntryEditing);
        setDimEntryEditing(null);
        setErrorEditing(false);
      }
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <TextField
        label={t("property_new_option")}
        variant="outlined"
        value={newDimEntry.name}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        error={error || listError}
        helperText={
          error || listError ? t("property_new_option_helper_text") : ""
        }
        sx={{ width: "100%" }}
      />
      <Box mt={2}>
        {dimEntries.map((de, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            sx={{ paddingLeft: 0.5 }}
          >
            {DimEntryEditing?.id === de.id ? (
              <div>
                <TextField
                  value={DimEntryEditing.name}
                  onChange={(e) =>
                    setDimEntryEditing({ ...de, name: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setDimEntryEditing(null);
                    } else if (e.key === "Escape") {
                      setDimEntryEditing(null);
                    }
                  }}
                  error={errorEditing}
                  helperText={
                    errorEditing ? t("property_new_option_helper_text") : ""
                  }
                  sx={{ width: "100%" }}
                />
                <IconButton onClick={handleEditDimEntry}>
                  <CheckIcon />
                </IconButton>
                <IconButton onClick={() => setDimEntryEditing(null)}>
                  <CloseIcon />
                </IconButton>
              </div>
            ) : (
              <div>
                <Box flexGrow={1}>{de.name}</Box>
                <IconButton onClick={() => setDimEntryEditing(de)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => deleteDimEntry(de.id)}>
                  <DeleteIcon />
                </IconButton>
              </div>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
