import {
  amber,
  blue,
  brown,
  cyan,
  deepOrange,
  deepPurple,
  green,
  indigo,
  lightBlue,
  lightGreen,
  lime,
  orange,
  pink,
  purple,
  red,
  teal,
  yellow,
} from '@mui/material/colors';
import { ConstraintColorsT } from '../types/constraint';

// Calendar table layout
export const CALENDAR_ROW_HEADER_WIDTH = 180; // px — sticky left column (worker/shift name)
export const CALENDAR_DAY_CELL_MIN_WIDTH = 40; // px — minimum width per day column

/** Builds the CSS grid template for a calendar row with `n` day columns. */
export function calendarGridTemplate(n: number, trailingColumn?: number): string {
  const trailing = trailingColumn ? ` ${trailingColumn}px` : '';
  return `${CALENDAR_ROW_HEADER_WIDTH}px repeat(${n}, minmax(${CALENDAR_DAY_CELL_MIN_WIDTH}px, 1fr))${trailing}`;
}

// General
export const NumDayWeek = 7;
export const WeekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export const NumHoursInDay = 24;
export const NumQuarterHoursInHour = 4;
export const PostSignInRoute = '/plan/workers';
export const PostSignUpRoute = '/auth/verify-email';

export const TrafficLightColorMappings: Record<
  string,
  { background: string; sample: string; text: string }
> = {
  red: {
    background: red[100],
    sample: red[500],
    text: red[900],
  },
  amber: {
    background: amber[100],
    sample: amber[500],
    text: amber[900],
  },
  green: {
    background: green[100],
    sample: green[500],
    text: green[900],
  },
};

// Shifts
// source: https://mui.com/material-ui/customization/color/
// 14 options, not using red, green, orange, and the greys
export const ShiftColorMappings: Record<
  string,
  { background: string; sample: string; text: string }
> = {
  pink: {
    background: pink[100],
    sample: pink[500],
    text: pink[900],
  },
  purple: {
    background: purple[100],
    sample: purple[500],
    text: purple[900],
  },
  deepPurple: {
    background: deepPurple[100],
    sample: deepPurple[500],
    text: deepPurple[900],
  },
  indigo: {
    background: indigo[100],
    sample: indigo[500],
    text: indigo[900],
  },
  blue: {
    background: blue[100],
    sample: blue[500],
    text: blue[900],
  },
  lightBlue: {
    background: lightBlue[100],
    sample: lightBlue[500],
    text: lightBlue[900],
  },
  cyan: {
    background: cyan[100],
    sample: cyan[500],
    text: cyan[900],
  },
  teal: {
    background: teal[100],
    sample: teal[500],
    text: teal[900],
  },
  lightGreen: {
    background: lightGreen[100],
    sample: lightGreen[500],
    text: lightGreen[900],
  },
  lime: {
    background: lime[100],
    sample: lime[500],
    text: lime[900],
  },
  yellow: {
    background: yellow[100],
    sample: yellow[500],
    text: yellow[900],
  },
  orange: {
    background: orange[100],
    sample: orange[500],
    text: orange[900],
  },
  deepOrange: {
    background: deepOrange[100],
    sample: deepOrange[500],
    text: deepOrange[900],
  },
  brown: {
    background: brown[100],
    sample: brown[500],
    text: brown[900],
  },
};

export const DefaultProperties: Record<string, string | boolean | string[]> = {
  str: '',
  int: '',
  bool: false,
  list: [],
};

// Constraints
export const PriorityLevels: string[] = ['low', 'medium', 'high'];
export const ConstraintDefaultColors: ConstraintColorsT = {
  shade0: '#f0efed',
  shade1: '#DFDFDF',
  shade2: '#808080',
  shade3: '#000000', // rgb(0, 0, 0), black
};
export const ConstraintColorActiveBack: string = '#ffffff';
export const ConstraintColorInactiveBack: string = '#f0efed';
export const ConstraintColorActiveText: string = '#000000';
export const ConstraintColorInactiveText: string = '#808080';

// Schedule Options
export const coverageSelectorColumns: string[] = [
  'Full period',
  'Start date',
  'End date',
  'Coverage',
];

//Schedules
export const SolveStatusList: string[] = [
  'Not solved',
  'Solved',
  'No solution',
  'Soft breached',
  'Hard breached',
];
export const SolveStatusColors: Record<string, string> = {
  NOT_SOLVED: 'default',
  SOLVED_NO_BREACH: 'success',
  SOLVED_HARD_BREACHED: 'error',
  SOLVED_SOFT_BREACHED: 'warning',
  NO_SOLUTION: 'error',
};
export const ColorNoCoverage: string = '#E0E0E0';
export const ColorPast: string = '#D5A8DC';
export const ColorValidated: string = '#AFDCA8';

// Maximum schedule/campaign duration in months (frontend mirror of shared)
export const MAX_SCHEDULE_DURATION_MONTHS = 3;

// User
export const SignInGrantType: string = 'password';

export const languages: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

// Style
export const DrawerWidth: number = 240;
