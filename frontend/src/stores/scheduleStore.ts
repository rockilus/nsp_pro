import { create } from "zustand";
import {
  ScheduleT,
  AssignmentT,
  CommentsT,
} from "../components/Schedule/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlSchedule = baseApiUrl + "/schedule";

type ScheduleStateT = {
  schedule: ScheduleT;
  fetchSchedule: () => void;
};

const toAssignmentT = (data: any) => {
  const assignment: AssignmentT = {
    ...data,
    date: new Date(data.date),
  };
  return assignment;
};

const toScheduleT = (data: any) => {
  const schedule: ScheduleT = {
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    assignments: data.assignments.map(toAssignmentT),
  };
  return schedule;
};

export const useScheduleStore = create<ScheduleStateT>()((set) => ({
  schedule: {
    id: "",
    startDate: new Date(0),
    endDate: new Date(0),
    assignments: [],
    comments: {
      constraintBreaches: [],
      missingCoverageDates: [],
    } as CommentsT,
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
}));
