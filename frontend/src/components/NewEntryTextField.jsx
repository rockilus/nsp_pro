"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var ValidateCancelChips_1 = __importDefault(require("./ValidateCancelChips"));
var Grid_1 = __importDefault(require("@mui/material/Grid"));
var TextField_1 = __importDefault(require("@mui/material/TextField"));
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
