import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useAssignmentStore, toAssignmentT } from "./assignmentStore";
import {
  useObjectiveBreachStore,
  toObjectiveBreachT,
} from "./objectiveBreachStore";
import { useRequestStore, toRequestT } from "./requestStore";
import { useSnackBarStore } from "./snackbarStore";
// Types
import { ScheduleT, SolutionT, ValidateT } from "../components/Schedule/types";

dayjs.extend(utc);

const apiUrlSchedule = process.env.NEXT_PUBLIC_API_URL + "/schedules";

type ScheduleStateT = {
  schedule: ScheduleT | null;
  fetchSchedule: (teamId: string) => void;
  fetchScheduleStore: (schedule: ScheduleT) => void;
  addSchedule: (teamId: string) => void;
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
    requests: data.requests.map(toRequestT),
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
  schedule: null,

  fetchSchedule: async (teamId) => {
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch schedules: " + responseData.detail,
            "error"
          );
        return;
      }
      const schedule: ScheduleT = responseData.map(toScheduleT);
      set({ schedule: schedule });
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch schedules, please try again later",
          "error"
        );
    }
  },

  fetchScheduleStore: (schedule) => {
    set({ schedule: toScheduleT(schedule) });
  },

  addSchedule: async (teamId) => {
    try {
      const response = await fetch(`${apiUrlSchedule}/teams/${teamId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add schedule: " + responseData.detail,
            "error"
          );
        return;
      }
      const newSchedule: ScheduleT = toScheduleT(responseData);
      set({ schedule: newSchedule });
    } catch (error) {
      console.error("Failed to add schedule:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add schedule, please try again later",
          "error"
        );
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to solve schedule: " + responseData.detail,
            "error"
          );
        return;
      }
      const newSolution: SolutionT = toSolutionT(responseData);
      console.log("newSolution", newSolution);

      set({ schedule: newSolution.schedule });
      useAssignmentStore
        .getState()
        .updateAssignmentStore(scheduleId, newSolution.assignments);
      useObjectiveBreachStore
        .getState()
        .updateObjectiveBreachStore(newSolution.objectiveBreaches);
      useRequestStore.getState().updateRequestStore(newSolution.requests);
    } catch (error) {
      console.error("Failed to solve schedule:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to solve schedule, please try again later",
          "error"
        );
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update schedule: " + responseData.detail,
            "error"
          );
        return;
      }
      const newSchedule: ScheduleT = toScheduleT(responseData);
      set({ schedule: newSchedule });
    } catch (error) {
      console.error("Failed to update schedule:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update schedule, please try again later",
          "error"
        );
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to validate schedule: " + responseData.detail,
            "error"
          );
        return;
      }
      const newValidate: ValidateT = toValidateT(responseData);
      set({ schedule: newValidate.schedule });
      useAssignmentStore
        .getState()
        .updateAssignmentStore(scheduleId, newValidate.assignments);
      useObjectiveBreachStore.getState().fetchObjectiveBreachesStore([]);
    } catch (error) {
      console.error("Failed to validate schedule:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to validate schedule, please try again later",
          "error"
        );
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete schedule: " + responseData.detail,
            "error"
          );
        return;
      }
      set({ schedule: null });
      useAssignmentStore.getState().deleteAStoreWithScheduleId(scheduleId);
      useObjectiveBreachStore
        .getState()
        .deleteOBStoreWithScheduleId(scheduleId);
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete schedule, please try again later",
          "error"
        );
    }
  },
}));
