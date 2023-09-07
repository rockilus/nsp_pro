import React, { useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

interface NewColumnConfigProps {
  handleClickNewColumn: (
    entry: string,
    entryType: string,
    selectOptions: string[]
  ) => void;
}

export default function NewColumnConfig(props: NewColumnConfigProps) {
  const { handleClickNewColumn } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [entry, setEntry] = useState<string>("");
  const [entryType, setEntryType] = useState("");
  const [newOption, setNewOption] = useState<string>("");
  const [selectOptions, setSelectOptions] = useState<string[]>([]);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (event: SelectChangeEvent) => {
    setEntryType(event.target.value as string);
  };

  return (
    <div>
      <Button
        id="basic-button"
        startIcon={<AddIcon />}
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        Add New Characteristic
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <Grid
          container
          direction="column"
          justifyContent="center"
          alignItems="flex-start"
          spacing={1}
        >
          <Grid item>
            <TextField
              id="outlined-basic"
              label="New Characteristic"
              variant="outlined"
              value={entry}
              onChange={(event) => setEntry(event.target.value)}
            />
          </Grid>
          <Grid item>
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label">Type</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={entryType}
                label="Age"
                onChange={handleChange}
              >
                <MenuItem value={"string"}>Text</MenuItem>
                <MenuItem value={"number"}>Number</MenuItem>
                <MenuItem value={"singleSelect"}>Select</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {entryType === "singleSelect" && (
            <Grid item>
              <TextField
                id="outlined-basic"
                label="Options"
                variant="outlined"
                value={newOption}
                onChange={(event) => setNewOption(event.target.value)}
              />
              <Button
                id="basic-button"
                variant="outlined"
                onClick={() => setSelectOptions([...selectOptions, newOption])}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
              {selectOptions.map((option) => (
                <Typography>{option}</Typography>
              ))}
            </Grid>
          )}
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            onClick={() => {
              handleClickNewColumn(entry, entryType, selectOptions);
              setAnchorEl(null);
            }}
          >
            Add
          </Button>
        </Grid>
      </Menu>
    </div>
  );
}
