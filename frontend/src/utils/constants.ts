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

// Workers
export const DefaultWorkerFields = ["Name"];

// Shifts
export const DefaultWorkShiftFields = [
  "Color",
  "Name",
  "Start time",
  "End time",
  "Staffing",
];
export const DefaultRestShiftFields = [
  "Color",
  "Name",
  "Start time",
  "End time",
];
export const ShiftColors = [
  "#0030C6",
  "#C60093",
  "#C69500",
  "#00C632",
  "#5000AB",
  "#AB0005",
  "#5BAB00",
  "#00ABA6",
];

export const PropertyTypes = {
  str: "String",
  int: "Integer",
  bool: "Boolean",
  list: "List",
};

export const DefaultProperties: Record<string, string | boolean | string[]> = {
  str: "",
  int: "",
  bool: false,
  list: [],
};

//Coverages
export const CovTimeColWidth = 50; // in pixels
export const CovTimeColPadR = 10; // in pixels
export const CovHeadRowHeight = 20; // in pixels
export const CovBodyRowHeight = 12; // in pixels
export const CovBorderThick = 1; // in pixels

// Requests
export const RequestTableFields = {
  Worker: "workerId",
  Shift: "shiftId",
  Date: "date",
  Hard: "hard",
  Status: "status",
};

//Schedules
export const SolveStatusList = [
  "Not solved",
  "Solved",
  "No solution",
  "Soft breached",
  "Hard breached",
];
export const SolveStatusColors = [
  "default",
  "success",
  "error",
  "warning",
  "error",
];
export const ColorNoCoverage = "#E0E0E0";
export const ColorPast = "#D5A8DC";
export const ColorValidated = "#AFDCA8";

// User
export const SignInGrantType = "password";

// Style
export const DrawerWidth: number = 240;

// Constraints
export const PriorityLevels = ["low", "medium", "high"];
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
