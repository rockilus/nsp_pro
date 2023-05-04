"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var AddOptionChip_1 = require("./AddOptionChip");
var NewEntryTextField_1 = require("./NewEntryTextField");
var Box_1 = require("@mui/material/Box");
var Typography_1 = require("@mui/material/Typography");
function OptionBlock() {
    var _a = (0, react_1.useState)(0), addOptionStatus = _a[0], setAddOptionStatus = _a[1];
    var handleAddOptionNextStep = function () {
        setAddOptionStatus(addOptionStatus + 1);
    };
    var handleAddOptionPreviousStep = function () {
        setAddOptionStatus(addOptionStatus - 1);
    };
    return (<Box_1.default>
      <div>
        <Typography_1.default variant="h6" gutterBottom>
          Doctor Profile Options
        </Typography_1.default>
      </div>
      {addOptionStatus === 1 && (<NewEntryTextField_1.default handleAddOptionNextStep={handleAddOptionNextStep} handleAddOptionPreviousStep={handleAddOptionPreviousStep}/>)}
      {addOptionStatus === 0 && (<AddOptionChip_1.default handleAddOptionNextStep={handleAddOptionNextStep}/>)}
    </Box_1.default>);
}
exports.default = OptionBlock;
