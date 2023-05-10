import React, { useContext, useState } from "react";

import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import CheckIcon from "@mui/icons-material/Check";
import Chip from "@mui/material/Chip";
import ClearIcon from "@mui/icons-material/Clear";

import { HospitalContext } from "../context/HospitalContext";

interface NewEntryTextFieldsProps {
  dictPath: string[];
  handleAddOptionCancel: () => void;
}

export default function NewEntryTextFields(props: NewEntryTextFieldsProps) {
  const [newOption, setNewOption] = useState("");
  const hospitalContext = useContext(HospitalContext);

  const handleSubmitClick = async () => {
    hospitalContext.addOptionToProfile(
      newOption,
      props.dictPath,
      hospitalContext.currentHospital?._id || ""
    );
    props.handleAddOptionCancel();
  };

  const handleCancelClick = () => {
    props.handleAddOptionCancel();
  };

  return (
    <React.Fragment>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="optionLabel"
            name="optionLabel"
            label="New Option Label"
            fullWidth
            variant="standard"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Stack spacing={1} alignItems="center">
            <Stack direction="row" spacing={1}>
              <Chip
                icon={<CheckIcon />}
                color="primary"
                variant="outlined"
                onClick={handleSubmitClick}
              />
              <Chip
                icon={<ClearIcon />}
                color="primary"
                variant="outlined"
                onClick={handleCancelClick}
              />
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}
