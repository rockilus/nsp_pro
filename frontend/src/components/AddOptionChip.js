"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var Add_1 = require("@mui/icons-material/Add");
var Chip_1 = require("@mui/material/Chip");
var IconChips = function (props) {
    var handleClick = function () {
        props.handleAddOptionNextStep();
    };
    return (<Chip_1.default icon={<Add_1.default />} onClick={handleClick} label="Add new option"/>);
};
exports.default = IconChips;
