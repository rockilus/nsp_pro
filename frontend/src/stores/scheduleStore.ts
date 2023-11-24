import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import {
  ScheduleT,
  AssignmentT,
  ScheduleOptionsT,
  ObjectiveBreachT,
  VariableT,
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

const toObjectiveBreachT = (data: any) => {
  const constraintBreach: ObjectiveBreachT = {
    ...data,
    variables: data.variables.map((variable: any) => {
      const variableT: VariableT = {
        ...variable,
        date: dayjs.utc(variable.date),
      };
      return variableT;
    }),
  };
  return constraintBreach;
};

const toScheduleT = (data: any) => {
  const schedule: ScheduleT = {
    ...data,
    startDate: dayjs.utc(data.startDate),
    endDate: dayjs.utc(data.endDate),
    missingCoverageDates: data.missingCoverageDates.map((isoDate: string) =>
      dayjs.utc(isoDate)
    ),
    assignments: data.assignments.map(toAssignmentT),
    objectiveBreaches: data.objectiveBreaches.map(toObjectiveBreachT),
  };
  return schedule;
};

export const useScheduleStore = create<ScheduleStateT>()((set) => ({
  schedule: {
    id: "",
    startDate: dayjs.utc(0),
    endDate: dayjs.utc(0),
    solveStatus: "Not solved",
    status: "WIP",
    assignments: [],
    missingCoverageDates: [],
    objectiveBreaches: [],
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
