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
// Styles
import "./update-dimension-dim-entries-input.css";
// Types
import { DimEntryT } from "@/types/dim-entry";

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
    <Box
      sx={{ width: "100%" }}
      data-testid={`dim-entries-input-${dimensionId}`}
    >
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
        data-testid={`new-dim-entry-field-${dimensionId}`}
        sx={{ width: "100%" }}
      />
      <Box mt={2} data-testid={`dim-entries-list-${dimensionId}`}>
        {dimEntries.map((de, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            sx={{ paddingLeft: 0.5 }}
            data-testid={`dim-entry-item-${de.id}`}
          >
            {DimEntryEditing?.id === de.id ? (
              <div
                className="edit-dim-entry"
                data-testid={`dim-entry-editing-${de.id}`}
              >
                <TextField
                  value={DimEntryEditing.name}
                  onChange={(e) =>
                    setDimEntryEditing({ ...de, name: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEditDimEntry();
                    } else if (e.key === "Escape") {
                      setDimEntryEditing(null);
                    }
                  }}
                  error={errorEditing}
                  helperText={
                    errorEditing ? t("property_new_option_helper_text") : ""
                  }
                  data-testid={`dim-entry-edit-field-${de.id}`}
                  sx={{ width: "100%" }}
                />
                <IconButton
                  onClick={handleEditDimEntry}
                  data-testid={`dim-entry-confirm-edit-${de.id}`}
                >
                  <CheckIcon />
                </IconButton>
                <IconButton
                  onClick={() => setDimEntryEditing(null)}
                  data-testid={`dim-entry-cancel-edit-${de.id}`}
                >
                  <CloseIcon />
                </IconButton>
              </div>
            ) : (
              <div
                className="edit-dim-entry"
                data-testid={`dim-entry-display-${de.id}`}
              >
                <Box flexGrow={1} data-testid={`dim-entry-name-${de.id}`}>
                  {de.name}
                </Box>
                <IconButton
                  onClick={() => setDimEntryEditing(de)}
                  data-testid={`dim-entry-edit-button-${de.id}`}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => deleteDimEntry(de.id)}
                  data-testid={`dim-entry-delete-button-${de.id}`}
                >
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
