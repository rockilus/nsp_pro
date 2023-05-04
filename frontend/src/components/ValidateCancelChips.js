"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var Check_1 = require("@mui/icons-material/Check");
var Chip_1 = require("@mui/material/Chip");
var Clear_1 = require("@mui/icons-material/Clear");
var Stack_1 = require("@mui/material/Stack");
var ValidateCancelChips = function (props) {
    var handleSubmitClick = function () {
        props.handleAddOptionNextStep();
    };
    var handleCancelClick = function () {
        props.handleAddOptionPreviousStep();
    };
    return (<Stack_1.default spacing={1} alignItems="center">
      <Stack_1.default direction="row" spacing={1}>
        <Chip_1.default icon={<Check_1.default />} color="primary" variant="outlined" onClick={handleSubmitClick}/>
        <Chip_1.default icon={<Clear_1.default />} color="primary" variant="outlined" onClick={handleCancelClick}/>
      </Stack_1.default>
    </Stack_1.default>);
};
exports.default = ValidateCancelChips;
