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
var react_1 = __importStar(require("react"));
var AddOptionChip_1 = __importDefault(require("./AddOptionChip"));
var NewEntryTextField_1 = __importDefault(require("./NewEntryTextField"));
var Box_1 = __importDefault(require("@mui/material/Box"));
var Typography_1 = __importDefault(require("@mui/material/Typography"));
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
