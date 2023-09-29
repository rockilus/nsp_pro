//==============================================================================
// State
//==============================================================================

export interface ConstraintParamsState {
  currentConstraintParams: Record<string, any>[] | null;
  error?: string;
  getConstraintParams: () => Promise<void>;
}

export interface ConstraintsState {
  currentConstraints: Record<string, any>[] | null;
  error?: string;
  postCreateConstraint: (constraint: Record<string, any>) => Promise<void>;
  getConstraints: () => Promise<void>;
  postUpdateConstraint: (
    constraintId: string,
    constraint: Record<string, any>
  ) => Promise<void>;
  postUpdateConstraintStatus: (
    constraintId: string,
    newStatus: boolean
  ) => Promise<void>;
  deleteConstraint: (constraintId: string) => Promise<void>;
}

export interface TimetablesState {
  currentTimetables: Record<string, any>[] | null;
  error?: string;
  postCreateTimetable: () => Promise<void>;
  getTimetables: () => Promise<void>;
  deleteTimetable: (timetableId: string) => Promise<void>;
}

export interface TimetableCategoriesState {
  currentTimetableCategories: Record<string, any>[] | null;
  error?: string;
  postCreateTimetableCategory: (
    label: string,
    timetableId: string
  ) => Promise<void>;
  getTimetableCategories: () => Promise<void>;
  postUpdateTimetableCategory: (
    label: string,
    timetableCategoryId: string
  ) => Promise<void>;
  deleteTimetableCategory: (timetableCategoryId: string) => Promise<void>;
}

export interface TimetableTimesState {
  currentTimetableTimes: Record<string, any>[] | null;
  error?: string;
  postCreateTimetableTime: (
    label: string,
    timetableId: string
  ) => Promise<void>;
  getTimetableTimes: () => Promise<void>;
  postUpdateTimetableTime: (
    label: string,
    timetableTimeId: string
  ) => Promise<void>;
  deleteTimetableTime: (timetableTimeId: string) => Promise<void>;
}

export interface TimetablePropertiesState {
  currentTimetableProperties: Record<string, any>[] | null;
  error?: string;
  postCreateTimetableProperty: (
    label: string,
    timetableId: string,
    timetableCategoryId: string,
    timetableTimeId: string
  ) => Record<string, any>;
  getTimetableProperties: () => Promise<void>;
  postUpdateTimetableProperty: (
    label: string,
    timetablePropertyId: string
  ) => Record<string, any>;
  deleteTimetableProperty: (timetablePropertyId: string) => Promise<void>;
}
