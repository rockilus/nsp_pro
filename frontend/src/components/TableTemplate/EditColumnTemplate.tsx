import React, { useContext, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import DialogColumnDelete from "./DialogColumnDelete";

interface Props {
  columnId: string;
  value: string;
  entryType: string;
  entryOptions: string[];
  setEntryValue: React.Dispatch<React.SetStateAction<string>>;
  setEntryType: React.Dispatch<React.SetStateAction<string>>;
  setEntryOptions: React.Dispatch<React.SetStateAction<string[]>>;
  handleDeleteColumn: (columnId: string) => void;
}

const propertyTypes = {
  str: "String",
  int: "Integer",
  bool: "Boolean",
  list: "List",
};

export default function EditColumnTemplate({
  columnId,
  value,
  entryType,
  entryOptions,
  setEntryValue,
  setEntryType,
  setEntryOptions,
  handleDeleteColumn,
}: Props) {
  const [newOption, setNewOption] = useState<string>("");

  const selectField = () => (
    <Box sx={{ minWidth: 120, width: "100%" }}>
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
              {propertyTypes[key as keyof typeof propertyTypes]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

  const addListOptions = () => (
    <Box sx={{ minWidth: 120, width: "100%" }}>
      {entryOptions.map((option, index) => (
        <ListItem key={index}>
          <Typography variant="body1" sx={{ width: "100%" }}>
            {option}
          </Typography>
          <CancelIcon
            color="disabled"
            sx={{ cursor: "pointer", marginLeft: "10px" }}
            onClick={() => {
              entryOptions.splice(index, 1);
              setEntryOptions([...entryOptions]);
            }}
          />
        </ListItem>
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
          onClick={() => {
            if (newOption === "") {
              return;
            }
            setEntryOptions([...entryOptions, newOption]);
            setNewOption("");
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ width: 350 }} role="presentation">
      <List>
        <ListItem key={"name"}>
          <TextField
            id="outlined-basic"
            label="Property Name"
            variant="outlined"
            value={value}
            onChange={(e) => setEntryValue(e.target.value)}
            fullWidth
          />
        </ListItem>
        <ListItem key={"entry_type"}>{selectField()}</ListItem>
      </List>
      {entryType === "list" && (
        <ListItem key={"list_options"}>{addListOptions()}</ListItem>
      )}
      <ListItem key={"button"}>
        <DialogColumnDelete
          columnId={columnId}
          handleDeleteColumn={handleDeleteColumn}
        />
      </ListItem>
    </Box>
  );
}
