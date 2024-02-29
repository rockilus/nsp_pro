import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { ScheduleT, SolutionT, ValidateT } from "../components/Schedule/types";
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
  fetchSchedules: (teamId: string) => void;
  addSchedule: (schedule: ScheduleT) => void;
  solveSchedule: (scheduleId: string, teamId: string) => void;
  updateSchedule: (updatedSchedule: ScheduleT) => void;
  validateSchedule: (scheduleId: string, teamId: string) => void;
  deleteSchedule: (scheduleId: string, teamId: string) => void;
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

const toValidateT = (data: any) => {
  const out: ValidateT = {
    schedule: toScheduleT(data.schedule),
    assignments: data.assignments.map(toAssignmentT),
  };
  return out;
};

export const useScheduleStore = create<ScheduleStateT>()((set) => ({
  schedules: [],

  fetchSchedules: async (teamId) => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(
        `${apiUrlSchedule}/teams/${teamId}`,
        options
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.statusText}`);
      }
      const data = await response.json();
      const schedules: ScheduleT[] = data.map(toScheduleT);
      set({ schedules });
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
    }
  },

  addSchedule: async (schedule) => {
    try {
      const response = await fetch(
        `${apiUrlSchedule}/teams/${schedule.teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(schedule),
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to add schedule: ${response.statusText}`);
      }
      const data = await response.json();
      const newSchedule: ScheduleT = toScheduleT(data);
      set((state) => ({
        schedules: [...state.schedules, newSchedule],
      }));
    } catch (error) {
      throw Error(`Failed to add schedule: ${error}`);
    }
  },

  solveSchedule: async (scheduleId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlSchedule}/${scheduleId}/solve/teams/${teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to add schedule: ${response.statusText}`);
      }
      const data = await response.json();
      const newSolution: SolutionT = toSolutionT(data);
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === newSolution.schedule.id ? newSolution.schedule : s
        ),
      }));
      useAssignmentStore
        .getState()
        .updateAssignmentStore(scheduleId, newSolution.assignments);
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
      const response = await fetch(
        `${apiUrlSchedule}/${updatedSchedule.id}/teams/${updatedSchedule.teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedSchedule),
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to update schedule: ${response.statusText}`);
      }
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

  validateSchedule: async (scheduleId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlSchedule}/${scheduleId}/validate/teams/${teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to validate schedule: ${response.statusText}`);
      }
      const data = await response.json();
      const newValidate: ValidateT = toValidateT(data);
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === newValidate.schedule.id ? newValidate.schedule : s
        ),
      }));
      useAssignmentStore
        .getState()
        .updateAssignmentStore(scheduleId, newValidate.assignments);
    } catch (error) {
      console.error("Failed to validate schedule:", error);
    }
  },

  deleteSchedule: async (scheduleId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlSchedule}/${scheduleId}/teams/${teamId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete schedule: ${response.statusText}`);
      }
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== scheduleId),
      }));
      useAssignmentStore.getState().deleteAStoreWithScheduleId(scheduleId);
      useObjectiveBreachStore
        .getState()
        .deleteOBStoreWithScheduleId(scheduleId);
      useStatStore.getState().deleteSStore();
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  },
}));
