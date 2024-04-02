import React, { useState } from "react";
// MUI
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
// Components
import OptionList from "./PropertyListInput";
// Stores
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
// Types
import { WorkerDimensionT } from "./types";
import { TeamT } from "../../containers/types";
// Constants
import { PropertyTypes } from "../../utils/constants";

interface Props {
  team: TeamT;
  drawerOpen: boolean;
  toggleDrawer: () => void;
}

export default function AddWorkerDimensionDrawer({
  team,
  drawerOpen,
  toggleDrawer,
}: Props) {
  const [name, setName] = useState("");
  const [entryType, setEntryType] = useState("");
  const [listOptions, setListOptions] = useState<string[]>([]);

  const addWorkerDimension = useWorkerDimensionStore(
    (state) => state.addWorkerDimension
  );

  const handleAddConfirm = () => {
    const newWorkerDimension: WorkerDimensionT = {
      id: "",
      teamId: team.id,
      name: name,
      entryType: entryType,
      entryOptions: listOptions,
    };
    addWorkerDimension(newWorkerDimension);
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
          {Object.keys(PropertyTypes).map((key) => (
            <MenuItem value={key} key={key}>
              {PropertyTypes[key as keyof typeof PropertyTypes]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
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
        <ListItem key={"entry_options"}>
          <OptionList options={listOptions} setOptions={setListOptions} />
        </ListItem>
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
