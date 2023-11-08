import React, { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DialogColumnDelete from "./DialogColumnDelete";

const propertyTypes = {
  str: "String",
  int: "Integer",
  bool: "Boolean",
  list: "List",
};

export default function UpdateColumnHeader({
  columnId,
  name: value,
  entryType,
  entryOptions,
  setNameState,
  setEntryType,
  setEntryOptions,
  handleDeleteColumn,
}) {
  const [newOption, setNewOption] = useState("");

  const handleRemoveOption = (index) => {
    const newEntryOptions = entryOptions.filter((_, idx) => idx !== index);
    setEntryOptions(newEntryOptions);
  };

  const handleAddOption = () => {
    if (newOption) {
      setEntryOptions((prevOptions) => [...prevOptions, newOption]);
      setNewOption("");
    }
  };

  return (
    <Box sx={{ width: 350 }} role="presentation">
      <Box sx={{ marginBottom: 2 }}>
        <TextField
          id="outlined-basic"
          label="Property Name"
          variant="outlined"
          value={value}
          onChange={(e) => setNameState(e.target.value)}
          fullWidth
        />
      </Box>
      <Box sx={{ marginBottom: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="demo-simple-select-label">Property Type</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={entryType}
            label="Property Type"
            onChange={(e) => setEntryType(e.target.value)}
          >
            {Object.keys(propertyTypes).map((key) => (
              <MenuItem value={key} key={key}>
                {propertyTypes[key]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {entryType === "list" && (
        <Box sx={{ marginBottom: 2 }}>
          {entryOptions.map((option, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
              <Typography variant="body1" sx={{ flexGrow: 1 }}>
                {option}
              </Typography>
              <CancelIcon
                color="disabled"
                sx={{ cursor: "pointer", marginLeft: "10px" }}
                onClick={() => handleRemoveOption(index)}
              />
            </Box>
          ))}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <TextField
              id="outlined-basic"
              label="New Option"
              variant="outlined"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              fullWidth
            />
            <AddIcon
              color="primary"
              sx={{ cursor: "pointer", marginLeft: "10px" }}
              onClick={handleAddOption}
            />
          </Box>
        </Box>
      )}
      <Box>
        <DialogColumnDelete
          columnId={columnId}
          handleDeleteColumn={handleDeleteColumn}
        />
      </Box>
    </Box>
  );
}
