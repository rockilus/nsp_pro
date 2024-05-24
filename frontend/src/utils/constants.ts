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

// App
export const tabs: { id: string; label: string }[] = [
  { id: "workers", label: "Workers" },
  { id: "shifts", label: "Shifts" },
  { id: "coverages", label: "Coverages" },
  { id: "constraints", label: "Constraints" },
  { id: "requests", label: "Requests" },
  { id: "schedule_options", label: "Schedule Options" },
  { id: "schedule", label: "Schedule" },
  { id: "stats", label: "Stats" },
];

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

// Requests
export const RequestTableFields: Record<string, string> = {
  Worker: "workerId",
  Shift: "shiftId",
  Date: "date",
  Hard: "hard",
  Status: "status",
};

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
    label: "Time worked (h)",
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
export const headerUnitOptions: Record<string, string>[] = [
  { name: "weekday", label: "Weekday" },
  { name: "week", label: "Week" },
  { name: "month", label: "Month" },
  { name: "year", label: "Year" },
  { name: "all", label: "All" },
];
export const timeFrameOptions: Record<string, string>[] = [
  { name: "last_12_months", label: "Last 12 months" },
  { name: "last_24_months", label: "Last 24 months" },
  { name: "last_36_months", label: "Last 36 months" },
  { name: "custom", label: "Custom" },
];
