import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import {
  ScheduleT,
  AssignmentT,
  ObjectiveBreachT,
  VariableT,
  SolutionT,
} from "../components/Schedule/types";
import { useAssignmentStore, toAssignmentT } from "./assignmentStore";
import {
  useObjectiveBreachStore,
  toObjectiveBreachT,
} from "./objectiveBreachStore";
import { useStatStore } from "./statStore";

dayjs.extend(utc);

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlSchedule = baseApiUrl + "/schedules";

type ScheduleStateT = {
  // schedule: ScheduleT;
  schedules: ScheduleT[];
  fetchSchedules: () => void;
  addSchedule: (schedule: ScheduleT) => void;
  solveSchedule: (id: string) => void;
  updateSchedule: (updatedSchedule: ScheduleT) => void;
  deleteSchedule: (id: string) => void;
};

const toScheduleT = (data: any) => {
  const schedule: ScheduleT = {
    ...data,
    startDate: dayjs.utc(data.startDate),
    endDate: dayjs.utc(data.endDate),
    missingCoverageDates: data.missingCoverageDates.map((isoDate: string) =>
      dayjs.utc(isoDate)
    ),
  };
  return schedule;
};

const toSolutionT = (data: any) => {
  const solution: SolutionT = {
    schedule: toScheduleT(data.schedule),
    assignments: data.assignments.map(toAssignmentT),
    objectiveBreaches: data.objectiveBreaches.map(toObjectiveBreachT),
    stats: data.stats,
  };
  return solution;
};

export const useScheduleStore = create<ScheduleStateT>()((set) => ({
  // schedule: {
  //   id: "",
  //   startDate: dayjs.utc(0),
  //   endDate: dayjs.utc(0),
  //   solveStatus: "Not solved",
  //   status: "WIP",
  //   assignments: [],
  //   missingCoverageDates: [],
  //   objectiveBreaches: [],
  //   stats: [],
  // },
  schedules: [],

  fetchSchedules: async () => {
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
      const schedules: ScheduleT[] = data.map(toScheduleT);
      set({ schedules });
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
    }
  },

  addSchedule: async (schedule) => {
    try {
      const response = await fetch(apiUrlSchedule, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(schedule),
      });
      const data = await response.json();
      const newSchedule: ScheduleT = toScheduleT(data);
      set((state) => ({
        schedules: [...state.schedules, newSchedule],
      }));
    } catch (error) {
      throw Error(`Failed to add schedule: ${error}`);
    }
  },

  solveSchedule: async (id) => {
    try {
      const response = await fetch(`${apiUrlSchedule}/${id}/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      const newSolution: SolutionT = toSolutionT(data);
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === newSolution.schedule.id ? newSolution.schedule : s
        ),
      }));
      useAssignmentStore
        .getState()
        .updateAssignmentStore(newSolution.assignments);
      useObjectiveBreachStore
        .getState()
        .updateObjectiveBreachStore(newSolution.objectiveBreaches);
      useStatStore.getState().updateStatStore(newSolution.stats);
    } catch (error) {
      throw Error(`Failed to add schedule: ${error}`);
    }
  },

  updateSchedule: async (updatedSchedule) => {
    try {
      const response = await fetch(`${apiUrlSchedule}/${updatedSchedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSchedule),
      });
      const data = await response.json();
      const newSchedule: ScheduleT = toScheduleT(data);
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === newSchedule.id ? newSchedule : s
        ),
      }));
    } catch (error) {
      console.error("Failed to update schedule:", error);
    }
  },

  deleteSchedule: async (id) => {
    try {
      await fetch(`${apiUrlSchedule}/${id}`, {
        method: "DELETE",
      });
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
      }));
      useAssignmentStore.getState().deleteAStoreWithScheduleId(id);
      useObjectiveBreachStore.getState().deleteOBStoreWithScheduleId(id);
      useStatStore.getState().deleteSStore();
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  },
}));
