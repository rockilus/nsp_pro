import { ConstraintColorsT } from "../components/Constraint/types";

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

// Shifts
export const ShiftColors: string[] = [
  "#0030C6",
  "#C60093",
  "#C69500",
  "#00C632",
  "#5000AB",
  "#AB0005",
  "#5BAB00",
  "#00ABA6",
];

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

// Style
export const DrawerWidth: number = 240;
