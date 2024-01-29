"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var Chip_1 = require("@mui/material/Chip");
var Clear_1 = require("@mui/icons-material/Clear");
var List_1 = require("@mui/material/List");
var ListItem_1 = require("@mui/material/ListItem");
var ListItemButton_1 = require("@mui/material/ListItemButton");
var ListItemText_1 = require("@mui/material/ListItemText");
var ListSubheader_1 = require("@mui/material/ListSubheader");
var constants_1 = require("../../utils/constants");
function BlockEditDict(_a) {
    var block = _a.block, templateBlock = _a.templateBlock, handleEditBlock = _a.handleEditBlock, handleClose = _a.handleClose;
    function isDictionary(obj) {
        return (obj !== null &&
            typeof obj === "object" &&
            !Array.isArray(obj) &&
            !(obj instanceof Date) &&
            !(obj instanceof RegExp) &&
            !(obj instanceof Function));
    }
    var initialValue = (0, react_1.useCallback)(function () {
        if (block === null) {
            return [];
        }
        if (Array.isArray(block.value) && block.value.every(isDictionary)) {
            return block.value;
        }
        throw new Error("block.value is not an array of dictionaries");
    }, [block]);
    var filterOptions = (0, react_1.useCallback)(function (searchQuery, selectedOptions, options) {
        var selectedArray = selectedOptions.map(Object.values).flat();
        if (Array.isArray(options)) {
            return searchQuery === ""
                ? options.filter(function (option) { return !selectedArray.includes(option); })
                : options.filter(function (option) {
                    return !selectedArray.includes(option) &&
                        option.toLowerCase().includes(searchQuery.toLowerCase());
                });
        }
        else {
            var out = {};
            for (var _i = 0, _a = Object.keys(options); _i < _a.length; _i++) {
                var key = _a[_i];
                var filteredKeyOptions = filterOptions(searchQuery, selectedOptions, options[key]);
                if (Array.isArray(filteredKeyOptions) &&
                    filteredKeyOptions.length > 0) {
                    out[key] = filteredKeyOptions;
                }
            }
            return out;
        }
    }, []);
    var _b = (0, react_1.useState)(initialValue), valueState = _b[0], setValueState = _b[1];
    var _c = (0, react_1.useState)(""), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = (0, react_1.useState)(filterOptions("", valueState, templateBlock.options)), filteredOptions = _d[0], setFilteredOptions = _d[1];
    var _e = (0, react_1.useState)(null), selectedOption = _e[0], setSelectedOption = _e[1];
    var inputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (block !== null) {
            setValueState(initialValue);
        }
    }, [block, initialValue]);
    var handleSearchChange = function (event) {
        var _a;
        var query = event.target.value.trim();
        setSearchQuery(query);
        var newFilteredOptions = filterOptions(query, valueState, templateBlock.options);
        setFilteredOptions(newFilteredOptions);
        if (Object.keys(newFilteredOptions).length > 0) {
            for (var _i = 0, _b = Object.keys(newFilteredOptions); _i < _b.length; _i++) {
                var key = _b[_i];
                if (newFilteredOptions[key].length > 0) {
                    setSelectedOption((_a = {}, _a[key] = newFilteredOptions[key][0], _a));
                    break;
                }
            }
        }
        else {
            setSelectedOption(null);
        }
    };
    var handleDeleteFromSelected = function (optionToDelete) {
        if (valueState.includes(optionToDelete)) {
            var newValue = valueState.filter(function (option) { return option !== optionToDelete; });
            handleEditBlock({
                name: templateBlock.name,
                type: templateBlock.type,
                value: newValue,
            });
            setFilteredOptions(filterOptions(searchQuery, newValue, templateBlock.options));
        }
        // Update the external state for "selected" here
    };
    var handleKeyDown = function (event) {
        var _a, _b, _c, _d, _e, _f;
        if (event.key === "Backspace" && event.currentTarget.selectionStart === 0) {
            var lastSelected = valueState[valueState.length - 1];
            if (lastSelected) {
                handleDeleteFromSelected(lastSelected);
            }
            // Update the external state for "selected" here
        }
        else if (event.key === "Enter") {
            if (selectedOption) {
                handleAddSelectedOption(Object.keys(selectedOption)[0], Object.values(selectedOption)[0]);
            }
        }
        else if (event.key === "ArrowDown") {
            var keys = Object.keys(filteredOptions);
            var selectedOptionTemp = selectedOption || (_a = {},
                _a[keys[0]] = filteredOptions[keys[0]][0],
                _a);
            if (!selectedOption) {
                setSelectedOption(selectedOptionTemp);
            }
            else if (keys.length > 0) {
                var selectKey = Object.keys(selectedOptionTemp)[0];
                var selectVal = Object.values(selectedOptionTemp)[0];
                var currentKeyIndex = keys.indexOf(selectKey);
                var currentValueIndex = filteredOptions[selectKey].indexOf(selectVal);
                if (currentValueIndex < filteredOptions[selectKey].length - 1) {
                    // There is a next value in the current key's array
                    setSelectedOption((_b = {},
                        _b[selectKey] = filteredOptions[selectKey][currentValueIndex + 1],
                        _b));
                }
                else if (currentKeyIndex < keys.length - 1) {
                    // There is a next key
                    setSelectedOption((_c = {},
                        _c[keys[currentKeyIndex + 1]] = filteredOptions[keys[currentKeyIndex + 1]][0],
                        _c));
                }
            }
        }
        else if (event.key === "ArrowUp") {
            var keys = Object.keys(filteredOptions);
            var selectedOptionTemp = selectedOption || (_d = {},
                _d[keys[keys.length - 1]] = filteredOptions[keys[keys.length - 1]][filteredOptions[keys[keys.length - 1]].length - 1],
                _d);
            if (!selectedOption) {
                setSelectedOption(selectedOptionTemp);
            }
            else if (keys.length > 0) {
                var selectKey = Object.keys(selectedOptionTemp)[0];
                var selectVal = Object.values(selectedOptionTemp)[0];
                var currentKeyIndex = keys.indexOf(selectKey);
                var currentValueIndex = filteredOptions[selectKey].indexOf(selectVal);
                if (currentValueIndex > 0) {
                    // There is a previous value in the current key's array
                    setSelectedOption((_e = {},
                        _e[selectKey] = filteredOptions[selectKey][currentValueIndex - 1],
                        _e));
                }
                else if (currentKeyIndex > 0) {
                    // There is a previous key
                    var previousKey = keys[currentKeyIndex - 1];
                    setSelectedOption((_f = {},
                        _f[previousKey] = filteredOptions[previousKey][filteredOptions[previousKey].length - 1],
                        _f));
                }
            }
        }
        else if (event.key === "Escape") {
            handleClose();
        }
    };
    var handleAddSelectedOption = function (newOptionKey, newOption) {
        var _a;
        if (newOptionKey in filteredOptions &&
            filteredOptions[newOptionKey].includes(newOption)) {
            var newValue = __spreadArray(__spreadArray([], valueState, true), [(_a = {}, _a[newOptionKey] = newOption, _a)], false);
            handleEditBlock({
                name: templateBlock.name,
                type: templateBlock.type,
                value: newValue,
            });
            setFilteredOptions(filterOptions("", newValue, templateBlock.options));
            setSearchQuery("");
        }
        // Update the external state for "selected" here
    };
    return (<div style={{
            width: "240px",
            borderRadius: "6px",
            boxShadow: "rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px",
        }}>
      <div style={{
            borderTopRightRadius: "inherit",
            borderTopLeftRadius: "inherit",
            // background: "#f0efed",
            background: constants_1.ConstraintDefaultColors.shade0,
        }}>
        {/* <div className="field-name" style={{ fontSize: "10px" }}>
          {selector.name.charAt(0).toUpperCase() + selector.name.slice(1)}
        </div> */}
        <div className="input-container" onClick={function () { return inputRef.current && inputRef.current.focus(); }} style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            overflow: "auto",
            cursor: "text",
            // Hide scrollbar
            scrollbarWidth: "none",
            msOverflowStyle: "none", // For Internet Explorer and Edge
            // "&::-webkit-scrollbar": {
            //   display: "none", // For Chrome, Safari and Opera
            // },
        }}>
          {valueState.map(function (option, index) { return (<Chip_1.default key={index} label={Object.values(option)} onDelete={function () { return handleDeleteFromSelected(option); }} deleteIcon={<Clear_1.default style={{
                    fontSize: "15px",
                    color: constants_1.ConstraintDefaultColors.shade2,
                }}/>} sx={{
                height: "21px",
                color: constants_1.ConstraintDefaultColors.shade3,
                background: constants_1.ConstraintDefaultColors.shade1,
            }}/>); })}
          <input type="text" value={searchQuery} onChange={handleSearchChange} onKeyDown={handleKeyDown} ref={inputRef} 
    // placeholder="Search shifts"
    style={{
            color: constants_1.ConstraintDefaultColors.shade3,
            height: "21px",
            border: "none",
            outline: "none",
            background: "transparent",
            minWidth: "60px",
            flexGrow: 1,
        }}/>
        </div>
      </div>
      <div style={{ padding: "8px 0 8px 0" }}>
        <div style={{
            fontSize: "13px",
            fontWeight: "bold",
            // color: "rgba(55, 53, 47, 0.65)",
            color: constants_1.ConstraintDefaultColors.shade2,
            padding: "0 16px 6px 16px",
        }}>
          Select one or more
        </div>
        {/* <List dense={true} sx={{ padding: "0 0 0 0" }}>
          {filteredOptions.map((option) => (
            <ListItemButton
              key={option}
              onClick={() => {
                handleAddSelectedOption(option);
              }}
              selected={selectedOption === option}
              sx={{ padding: "0 0 0 0" }}
            >
              <ListItem sx={{ padding: "0 16px 0 16px" }}>
                <ListItemText
                  primary={option}
                  style={{ color: ConstraintDefaultColors.shade3 }}
                />
              </ListItem>
            </ListItemButton>
          ))}
        </List> */}
        <List_1.default sx={{
            width: "100%",
            maxWidth: 360,
            bgcolor: "background.paper",
            position: "relative",
            overflow: "auto",
            maxHeight: 300,
            "& ul": { padding: 0 },
        }} subheader={<li />}>
          {Object.keys(filteredOptions).map(function (sectionLabel, sectionIndex) { return (<li key={"section-".concat(sectionIndex)}>
              <ul>
                <ListSubheader_1.default>{sectionLabel}</ListSubheader_1.default>
                {filteredOptions[sectionLabel].map(function (option, index) { return (<ListItemButton_1.default key={"item-".concat(sectionLabel, "-").concat(index)} onClick={function () {
                    handleAddSelectedOption(sectionLabel, option);
                }} selected={selectedOption
                    ? selectedOption[sectionLabel] === option
                    : false} sx={{ padding: "0 0 0 0" }}>
                    <ListItem_1.default sx={{ padding: "0 16px 0 16px" }}>
                      <ListItemText_1.default primary={option} style={{ color: constants_1.ConstraintDefaultColors.shade3 }}/>
                    </ListItem_1.default>
                  </ListItemButton_1.default>); })}
              </ul>
            </li>); })}
        </List_1.default>
      </div>
    </div>);
}
exports.default = BlockEditDict;
