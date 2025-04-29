import { ConstraintColorsT } from "../types/constraint";

// General
export const NumDayWeek = 7;
export const WeekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const NumHoursInDay = 24;
export const NumQuarterHoursInHour = 4;
export const PostSignInRoute = "/plan/workers";

// Shifts
// source: https://mui.com/material-ui/customization/color/
// 14 options, not using red, green, orange, and the greys
export const ShiftColorMappings: Record<
  string,
  { background: string; sample: string; text: string }
> = {
  pink: {
    background: "#f8bbd0",
    sample: "#e91e63",
    text: "#880e4f",
  },
  purple: {
    background: "#e1bee7",
    sample: "#9c27b0",
    text: "#4a148c",
  },
  deepPurple: {
    background: "#d1c4e9",
    sample: "#673ab7",
    text: "#311b92",
  },
  indigo: {
    background: "#c5cae9",
    sample: "#3f51b5",
    text: "#1a237e",
  },
  blue: {
    background: "#bbdefb", // 100
    sample: "#2196f3", // 500
    text: "#0d47a1", //900
  },
  lightBlue: {
    background: "#b3e5fc",
    sample: "#03a9f4",
    text: "#01579b",
  },
  cyan: {
    background: "#b2ebf2",
    sample: "#00bcd4",
    text: "#006064",
  },
  teal: {
    background: "#b2dfdb",
    sample: "#009688",
    text: "#004d40",
  },
  lightGreen: {
    background: "#dcedc8",
    sample: "#8bc34a",
    text: "#33691e",
  },
  lime: {
    background: "#f0f4c3",
    sample: "#cddc39",
    text: "#827717",
  },
  yellow: {
    background: "#fff9c4",
    sample: "#ffeb3b",
    text: "#f57f17",
  },
  amber: {
    background: "#ffecb3",
    sample: "#ffc107",
    text: "#ff6f00",
  },
  deepOrange: {
    background: "#ffccbc",
    sample: "#ff5722",
    text: "#bf360c",
  },
  brown: {
    background: "#d7ccc8",
    sample: "#795548",
    text: "#3e2723",
  },
};

export const DefaultProperties: Record<string, string | boolean | string[]> = {
  str: "",
  int: "",
  bool: false,
  list: [],
};

//Coverages
export const CovTimeColWidth: number = 50; // in pixels
export const CovTimeColPadR: number = 10; // in pixels
export const CovHeadRowHeight: number = 20; // in pixels
export const CovBodyRowHeight: number = 12; // in pixels
export const CovBorderThick: number = 1; // in pixels

// Constraints
export const PriorityLevels: string[] = ["low", "medium", "high"];
export const ConstraintDefaultColors: ConstraintColorsT = {
  shade0: "#f0efed",
  shade1: "#DFDFDF",
  shade2: "#808080",
  shade3: "#000000", // rgb(0, 0, 0), black
};
export const ConstraintColorActiveBack: string = "#ffffff";
export const ConstraintColorInactiveBack: string = "#f0efed";
export const ConstraintColorActiveText: string = "#000000";
export const ConstraintColorInactiveText: string = "#808080";

// Schedule Options
export const coverageSelectorColumns: string[] = [
  "Full period",
  "Start date",
  "End date",
  "Coverage",
];

//Schedules
export const SolveStatusList: string[] = [
  "Not solved",
  "Solved",
  "No solution",
  "Soft breached",
  "Hard breached",
];
export const SolveStatusColors: string[] = [
  "default",
  "success",
  "error",
  "warning",
  "error",
];
export const ColorNoCoverage: string = "#E0E0E0";
export const ColorPast: string = "#D5A8DC";
export const ColorValidated: string = "#AFDCA8";

// User
export const SignInGrantType: string = "password";

export const languages: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
};

// Style
export const DrawerWidth: number = 240;
