import React, { useContext, useState } from "react";

import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import CheckIcon from "@mui/icons-material/Check";
import Chip from "@mui/material/Chip";
import ClearIcon from "@mui/icons-material/Clear";

import { HospitalContext } from "../../context/HospitalContext";

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
              <CheckCircleOutlineIcon
                onClick={handleSubmitClick}
                sx={{ cursor: "pointer" }}
              ></CheckCircleOutlineIcon>
              <CancelOutlinedIcon
                onClick={handleCancelClick}
                sx={{ cursor: "pointer" }}
              ></CancelOutlinedIcon>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}
