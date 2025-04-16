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
    <Box sx={{ width: "100%" }}>
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
      />
      <Box mt={2}>
        {specialties.map((de, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            sx={{ paddingLeft: 0.5 }}
          >
            {SpecialtyEditing?.id === de.id ? (
              <div className="edit-specialty">
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
                />
                <IconButton onClick={handleEditSpecialty}>
                  <CheckIcon />
                </IconButton>
                <IconButton onClick={() => setSpecialtyEditing(null)}>
                  <CloseIcon />
                </IconButton>
              </div>
            ) : (
              <div className="edit-specialty">
                <Box flexGrow={1}>{de.name}</Box>
                <IconButton onClick={() => setSpecialtyEditing(de)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => deleteSpecialty(de.id)}>
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
