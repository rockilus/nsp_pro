import * as React from "react";

import ValidateCancelChips from "./ValidateCancelChips";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

interface NewEntryTextFieldsProps {
  handleAddOptionNextStep: () => void;
  handleAddOptionPreviousStep: () => void;
}

const NewEntryTextFields: React.FC<NewEntryTextFieldsProps> = (props) => {
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
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <ValidateCancelChips
            handleAddOptionNextStep={props.handleAddOptionNextStep}
            handleAddOptionPreviousStep={props.handleAddOptionPreviousStep}
          />
        </Grid>
        {/* <Grid item xs={12} sm={6}>
            <TextField
              required
              id="optionValues"
              name="optionValues"
              label="Option values, separated by a comma"
              fullWidth
              variant="standard"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              id="additionalOptionValues"
              name="additionalOptionValues"
              label="Additional option values, separated by a comma"
              fullWidth
              variant="standard"
            />
          </Grid> */}
      </Grid>
    </React.Fragment>
  );
};

export default NewEntryTextFields;
