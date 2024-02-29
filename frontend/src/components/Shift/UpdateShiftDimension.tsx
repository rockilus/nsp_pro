import React, { useState } from "react";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
// Components
import DialogShiftDimensionDel from "./DialogShiftDimensionDel";
// Types
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  shiftDimensionId: string;
  name: string;
  entryType: string;
  entryOptions: string[];
  setNameState: React.Dispatch<React.SetStateAction<string>>;
  setEntryOptions: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function UpdateShiftDimension({
  team,
  shiftDimensionId,
  name: value,
  entryType,
  entryOptions,
  setNameState,
  setEntryOptions,
}: Props) {
  const [newOption, setNewOption] = useState<string>("");

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
            onChange={(e) => setNameState(e.target.value)}
            fullWidth
          />
        </ListItem>
      </List>
      {entryType === "list" && (
        <ListItem key={"list_options"}>{addListOptions()}</ListItem>
      )}
      <ListItem key={"button"}>
        <DialogShiftDimensionDel
          team={team}
          shiftDimensionId={shiftDimensionId}
        />
      </ListItem>
    </Box>
  );
}
