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

// Stats
export const statsUnitOptions: Record<string, string>[] = [
  { name: "custom", label: "Custom", description: "Custom stats" },
  {
    name: "nb_days_worked",
    label: "Nb days worked",
    description: "Number of days worked",
  },
  {
    name: "time_worked",
    label: "Time worked",
    description: "Total time worked",
  },
  {
    name: "nb_shifts_worked",
    label: "Nb shifts worked",
    description: "Number of shifts worked",
  },
  {
    name: "nb_rest_days",
    label: "Nb rest days",
    description: "Number of rest days",
  },
  {
    name: "nb_rest_shifts",
    label: "Nb rest shifts",
    description: "Number of rest shifts",
  },
  {
    name: "nb_times_shift",
    label: "Nb time shift",
    description: "Number of times a shift was worked",
  },
  {
    name: "nb_times_rest",
    label: "Nb time rest",
    description: "Number of times a rest was taken",
  },
];
export const headerUnitOptions = [
  { name: "weekday", label: "Weekday" },
  { name: "week", label: "Week" },
  { name: "month", label: "Month" },
  { name: "year", label: "Year" },
  { name: "all", label: "All" },
];
export const timeFrameOptions = [
  { name: "last_12_months", label: "Last 12 months" },
  { name: "last_24_months", label: "Last 24 months" },
  { name: "last_36_months", label: "Last 36 months" },
  { name: "custom", label: "Custom" },
];
