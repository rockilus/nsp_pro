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
var Check_1 = __importDefault(require("@mui/icons-material/Check"));
var Chip_1 = __importDefault(require("@mui/material/Chip"));
var Clear_1 = __importDefault(require("@mui/icons-material/Clear"));
var Stack_1 = __importDefault(require("@mui/material/Stack"));
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
