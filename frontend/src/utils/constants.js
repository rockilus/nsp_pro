"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstraintDefaultColors = exports.PriorityLevels = exports.DrawerWidth = exports.PermissionMenuHeight = exports.SignInGrantType = exports.ColorValidated = exports.ColorPast = exports.ColorNoCoverage = exports.SolveStatusColors = exports.SolveStatusList = exports.CovBorderThick = exports.CovBodyRowHeight = exports.CovHeadRowHeight = exports.CovTimeColPadR = exports.CovTimeColWidth = exports.DefaultProperties = exports.PropertyTypes = exports.ShiftColors = exports.DefaultShiftFields = exports.NumQuarterHoursInHour = exports.NumHoursInDay = exports.WeekDays = exports.NumDayWeek = void 0;
// General
exports.NumDayWeek = 7;
exports.WeekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];
exports.NumHoursInDay = 24;
exports.NumQuarterHoursInHour = 4;
// Shifts
exports.DefaultShiftFields = [
    "Color",
    "Name",
    "Start time",
    "End time",
    "Staffing",
    "Is time off",
];
exports.ShiftColors = [
    "#0030C6",
    "#C60093",
    "#C69500",
    "#00C632",
    "#5000AB",
    "#AB0005",
    "#5BAB00",
    "#00ABA6",
];
exports.PropertyTypes = {
    str: "String",
    int: "Integer",
    bool: "Boolean",
    list: "List",
};
exports.DefaultProperties = {
    str: "",
    int: "",
    bool: false,
    list: "",
};
//Coverages
exports.CovTimeColWidth = 50; // in pixels
exports.CovTimeColPadR = 10; // in pixels
exports.CovHeadRowHeight = 20; // in pixels
exports.CovBodyRowHeight = 12; // in pixels
exports.CovBorderThick = 1; // in pixels
//Schedules
exports.SolveStatusList = [
    "Not solved",
    "Solved",
    "No solution",
    "Soft breached",
    "Hard breached",
];
exports.SolveStatusColors = [
    "default",
    "success",
    "error",
    "warning",
    "error",
];
exports.ColorNoCoverage = "#E0E0E0";
exports.ColorPast = "#D5A8DC";
exports.ColorValidated = "#AFDCA8";
// User
exports.SignInGrantType = "password";
// Admin
exports.PermissionMenuHeight = 48;
// Style
exports.DrawerWidth = 240;
// Constraints
exports.PriorityLevels = ["low", "medium", "high"];
// export const ConstraintEditColors: Record<string, ConstraintColorsT> = {
//   operator: {
//     light: "#F7E8E5",
//     inter: "#E1A498",
//     dark: "#C24831", // rgb(194, 72, 49), p.185, red
//   },
//   "#": {
//     light: "#E4F4E9",
//     inter: "#92D2A6",
//     dark: "#25A64C", // rgb(37, 166, 76), p.185, green
//   },
//   timing: {
//     light: "#FEF3E1",
//     inter: "#FBD188",
//     dark: "#F7A211", // rgb(247, 162, 17), p.185, yellow
//   },
//   shift: {
//     light: "#FFF3F5",
//     inter: "#FFCFD8",
//     dark: "#FF9EB2", // rgb(255, 158, 178), p.185, rose
//   },
//   worker: {
//     light: "#F0F9F7",
//     inter: "#C2E9E1",
//     dark: "#84D2C2", // rgb(132, 210, 194), p.185, teal
//   },
//   // unused1: {
//   //   light: "#F5EBEA",
//   //   inter: "#D8B0AA",
//   //   dark: "#B26054", // rgb(178, 96, 84), p.185, brown
//   // },
//   // unused2: {
//   //   light: "#E7E5F0",
//   //   inter: "#9E97C5",
//   //   dark: "#3D308A", // rgb(61, 48, 138), p.185, blue
//   // },
// };
exports.ConstraintDefaultColors = {
    shade0: "#f0efed",
    shade1: "#DFDFDF",
    shade2: "#808080",
    shade3: "#000000", // rgb(0, 0, 0), black
};
