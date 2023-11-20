import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import {
  ScheduleT,
  AssignmentT,
  CommentsT,
  ScheduleOptionsT,
  ConstraintBreachT,
} from "../components/Schedule/types";

dayjs.extend(utc);

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlSchedule = baseApiUrl + "/schedule";

type ScheduleStateT = {
  schedule: ScheduleT;
  fetchSchedule: () => void;
  addSchedule: (scheduleOptions: ScheduleOptionsT) => void;
};

const toAssignmentT = (data: any) => {
  const assignment: AssignmentT = {
    ...data,
    date: dayjs.utc(data.date),
  };
  return assignment;
};

const toConstraintBreachT = (data: any) => {
  const constraintBreach: ConstraintBreachT = {
    ...data,
    variables: data.variables.map((variable: any) => {
      const variableDate = dayjs.utc(variable[1]);
      return [variable[0], variableDate, variable[2]];
    }),
  };
  return constraintBreach;
};

const toCommentsT = (data: any) => {
  const comments: CommentsT = {
    constraintBreaches: data.constraintBreaches.map(toConstraintBreachT),
    missingCoverageDates: data.missingCoverageDates.map((isoDate: string) =>
      dayjs.utc(isoDate)
    ),
  };
  return comments;
};

const toScheduleT = (data: any) => {
  const schedule: ScheduleT = {
    ...data,
    startDate: dayjs.utc(data.startDate),
    endDate: dayjs.utc(data.endDate),
    assignments: data.assignments.map(toAssignmentT),
    comments: toCommentsT(data.comments),
  };
  return schedule;
};

export const useScheduleStore = create<ScheduleStateT>()((set) => ({
  schedule: {
    id: "",
    startDate: dayjs.utc(0),
    endDate: dayjs.utc(0),
    status: "Not solved",
    assignments: [],
    comments: {
      constraintBreaches: [],
      missingCoverageDates: [],
    } as CommentsT,
    stats: [],
  },

  fetchSchedule: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlSchedule, options);
      const data = await response.json();
      const schedule: ScheduleT = toScheduleT(data);
      set({ schedule });
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
    }
  },

  addSchedule: async (scheduleOptions) => {
    try {
      const response = await fetch(apiUrlSchedule, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scheduleOptions),
      });
      const data = await response.json();
      const schedule: ScheduleT = toScheduleT(data);
      set({ schedule });
    } catch (error) {
      throw Error(`Failed to add schedule: ${error}`);
    }
  },
}));
