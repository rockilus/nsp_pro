import React, { useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

interface Props {
  drawerOpen: boolean;
  toggleDrawer: () => void;
  handleAddColumn: (
    name: string,
    entryType: string,
    entryOptions: string[]
  ) => void;
}

const propertyTypes = {
  str: "String",
  int: "Integer",
  bool: "Boolean",
  list: "List",
};

export default function DrawerTemplate({
  drawerOpen,
  toggleDrawer,
  handleAddColumn,
}: Props) {
  const [name, setName] = useState("");
  const [entryType, setEntryType] = useState("");
  const [listOptions, setListOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState<string>("");

  const handleAddConfirm = async () => {
    await handleAddColumn(name, entryType, listOptions);
    toggleDrawer();
  };

  const handleChange = (event: SelectChangeEvent) => {
    setEntryType(event.target.value as string);
  };

  const selectField = () => (
    <Box sx={{ minWidth: 120, width: "100%" }}>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">Property Type</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={entryType}
          label="Property Type"
          onChange={handleChange}
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
      {listOptions.map((option, index) => (
        <ListItem key={index}>
          <Typography variant="body1" sx={{ width: "100%" }}>
            {option}
          </Typography>
          <CancelIcon
            color="disabled"
            sx={{ cursor: "pointer", marginLeft: "10px" }}
            onClick={() => {
              listOptions.splice(index, 1);
              setListOptions([...listOptions]);
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
            setListOptions([...listOptions, newOption]);
            setNewOption("");
          }}
        />
      </Box>
    </Box>
  );

  const drawerContent = () => (
    <Box sx={{ width: 350 }} role="presentation">
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          pt: 2,
          pr: 2,
          pl: 2,
        }}
      >
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          New Property
        </Typography>
        <CancelIcon
          onClick={toggleDrawer}
          sx={{ color: "text.secondary", cursor: "pointer" }}
        />
      </Box>
      <List>
        <ListItem key={"name"}>
          <TextField
            id="outlined-basic"
            label="Property Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
        </ListItem>
        <ListItem key={"entry_type"}>{selectField()}</ListItem>
      </List>
      {entryType === "list" && (
        <ListItem key={"list_options"}>{addListOptions()}</ListItem>
      )}

      <Button
        variant="contained"
        color="primary"
        sx={{
          marginLeft: "16px",
        }}
        onClick={handleAddConfirm}
      >
        Add
      </Button>
    </Box>
  );

  return (
    <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer}>
      {drawerContent()}
    </Drawer>
  );
}
