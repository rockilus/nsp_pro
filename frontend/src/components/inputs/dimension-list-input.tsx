import React, { useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";

interface Props {
  options: string[];
  listError: boolean;
  addOption: (newOption: string) => void;
  removeOption: (index: number) => void;
}

export default function DimensionListInput({
  lng,
  options,
  listError,
  addOption,
  removeOption,
}: {
  lng: string;
  options: string[];
  listError: boolean;
  addOption: (newOption: string) => void;
  removeOption: (index: number) => void;
}) {
  const { t } = useTranslation(lng, "inputs-components");

  const [newOption, setNewOption] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewOption(event.target.value);
  };

  const handleAddOption = () => {
    if (newOption.trim() !== "") {
      addOption(newOption);
      setNewOption("");
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

  const handleDeleteOption = (index: number) => {
    removeOption(index);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <TextField
        label={t("property_new_option")}
        variant="outlined"
        value={newOption}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        error={error || listError}
        helperText={
          error || listError ? t("property_new_option_helper_text") : ""
        }
        sx={{ width: "100%" }}
      />
      <Box mt={2}>
        {options.map((option, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            sx={{ paddingLeft: 0.5 }}
          >
            <Box flexGrow={1}>{option}</Box>
            <IconButton onClick={() => handleDeleteOption(index)}>
              <CancelIcon />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
