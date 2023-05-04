"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var ValidateCancelChips_1 = require("./ValidateCancelChips");
var Grid_1 = require("@mui/material/Grid");
var TextField_1 = require("@mui/material/TextField");
var NewEntryTextFields = function (props) {
    return (<React.Fragment>
      <Grid_1.default container spacing={3}>
        <Grid_1.default item xs={12} sm={6}>
          <TextField_1.default required id="optionLabel" name="optionLabel" label="New Option Label" fullWidth variant="standard"/>
        </Grid_1.default>
        <Grid_1.default item xs={12} sm={6}>
          <ValidateCancelChips_1.default handleAddOptionNextStep={props.handleAddOptionNextStep} handleAddOptionPreviousStep={props.handleAddOptionPreviousStep}/>
        </Grid_1.default>
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
      </Grid_1.default>
    </React.Fragment>);
};
exports.default = NewEntryTextFields;
