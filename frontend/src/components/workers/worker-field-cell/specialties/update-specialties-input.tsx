import React, { useState } from "react";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
// Styles
import "./update-specialties-input.css";
// Types
import { SpecialtyT } from "@/types/specialty";

export default function UpdateSpecialtiesInput({
  lng,
  specialties,
  teamId,
  listError,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty,
}: {
  lng: string;
  specialties: SpecialtyT[];
  teamId: string;
  listError: boolean;
  createSpecialty: (newSpecialty: SpecialtyT) => void;
  updateSpecialty: (specialty: SpecialtyT) => void;
  deleteSpecialty: (specialtyId: string) => void;
}) {
  const { t } = useTranslation(lng, "inputs-components");

  const [newSpecialty, setNewSpecialty] = useState<SpecialtyT>({
    id: "",
    teamId: teamId,
    name: "",
    deleted: false,
  });
  const [SpecialtyEditing, setSpecialtyEditing] = useState<SpecialtyT | null>(
    null
  );
  const [error, setError] = useState<boolean>(false);
  const [errorEditing, setErrorEditing] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewSpecialty({ ...newSpecialty, name: event.target.value });
  };

  const handleAddOption = () => {
    if (newSpecialty.name.trim() !== "") {
      createSpecialty(newSpecialty);
      setNewSpecialty({
        id: "",
        teamId: teamId,
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

  const handleEditSpecialty = () => {
    if (SpecialtyEditing) {
      if (SpecialtyEditing.name.trim() === "") {
        setErrorEditing(true);
      } else {
        updateSpecialty(SpecialtyEditing);
        setSpecialtyEditing(null);
        setErrorEditing(false);
      }
    }
  };

  return (
    <Box sx={{ width: "100%" }} data-testid="update-specialties-input">
      <TextField
        label={t("property_new_option")}
        variant="outlined"
        value={newSpecialty.name}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        error={error || listError}
        helperText={
          error || listError ? t("property_new_option_helper_text") : ""
        }
        sx={{ width: "100%" }}
        inputProps={{
          "data-testid": "new-specialty-input",
        }}
      />
      <Box mt={2} data-testid="specialties-list">
        {specialties.map((de, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            sx={{ paddingLeft: 0.5 }}
            data-testid={`specialty-item-${de.id}`}
          >
            {SpecialtyEditing?.id === de.id ? (
              <div
                className="edit-specialty"
                data-testid={`specialty-editing-${de.id}`}
              >
                <TextField
                  value={SpecialtyEditing.name}
                  onChange={(e) =>
                    setSpecialtyEditing({ ...de, name: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEditSpecialty();
                    } else if (e.key === "Escape") {
                      setSpecialtyEditing(null);
                    }
                  }}
                  error={errorEditing}
                  helperText={
                    errorEditing ? t("property_new_option_helper_text") : ""
                  }
                  sx={{ width: "100%" }}
                  inputProps={{
                    "data-testid": `specialty-edit-input-${de.id}`,
                  }}
                />
                <IconButton
                  onClick={handleEditSpecialty}
                  data-testid={`specialty-confirm-edit-${de.id}`}
                >
                  <CheckIcon />
                </IconButton>
                <IconButton
                  onClick={() => setSpecialtyEditing(null)}
                  data-testid={`specialty-cancel-edit-${de.id}`}
                >
                  <CloseIcon />
                </IconButton>
              </div>
            ) : (
              <div
                className="edit-specialty"
                data-testid={`specialty-display-${de.id}`}
              >
                <Box flexGrow={1} data-testid={`specialty-name-${de.id}`}>
                  {de.name}
                </Box>
                <IconButton
                  onClick={() => setSpecialtyEditing(de)}
                  data-testid={`specialty-edit-button-${de.id}`}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => deleteSpecialty(de.id)}
                  data-testid={`specialty-delete-button-${de.id}`}
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
