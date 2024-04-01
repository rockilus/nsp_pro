import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { AssignmentT } from "../components/Schedule/types";

dayjs.extend(utc);

const apiUrlAssignment = process.env.NEXT_PUBLIC_API_URL + "/assignments";

type AssignmentStateT = {
  assignments: AssignmentT[];
  fetchAssignments: (teamId: string) => void;
  addAssignment: (assignment: AssignmentT, teamId: string) => void;
  updateAssignmentStore: (
    scheuleId: string,
    updatedAssignments: AssignmentT[]
  ) => void;
  updateAssignment: (updatedAssignment: AssignmentT, teamId: string) => void;
  deleteAssignment: (assignmentId: string, teamId: string) => void;
  deleteAStoreWithScheduleId: (scheduleId: string) => void;
};

export const toAssignmentT = (data: any) => {
  const assignment: AssignmentT = {
    ...data,
    date: dayjs.utc(data.date),
  };
  return assignment;
};

export const useAssignmentStore = create<AssignmentStateT>()((set) => ({
  assignments: [],

  fetchAssignments: async (teamId) => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(
        `${apiUrlAssignment}/teams/${teamId}`,
        options
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch assignments: " + responseData.detail,
            "error"
          );
        return;
      }
      const assignments: AssignmentT[] = responseData.map(toAssignmentT);
      set({ assignments });
    } catch (error) {
      console.error("Failed to fetch assignment:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch assignments, please try again later",
          "error"
        );
    }
  },

  addAssignment: async (assignment, teamId) => {
    try {
      const response = await fetch(`${apiUrlAssignment}/teams/${teamId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignment),
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add assignment: " + responseData.detail,
            "error"
          );
        return;
      }
      const newAssignment: AssignmentT = toAssignmentT(responseData);
      set((state) => ({
        assignments: [...state.assignments, newAssignment],
      }));
    } catch (error) {
      console.error("Failed to add assignment:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add assignment, please try again later",
          "error"
        );
    }
  },

  updateAssignmentStore: (scheduleId, updatedAssignments) => {
    set((state) => ({
      assignments: [
        ...state.assignments.filter((a) => a.scheduleId !== scheduleId),
        ...updatedAssignments,
      ],
    }));
  },

  updateAssignment: async (updatedAssignment, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlAssignment}/${updatedAssignment.id}/teams/${teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedAssignment),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update assignment: " + responseData.detail,
            "error"
          );
        return;
      }
      const newAssignment: AssignmentT = toAssignmentT(responseData);
      set((state) => ({
        assignments: state.assignments.map((s) =>
          s.id === newAssignment.id ? newAssignment : s
        ),
      }));
    } catch (error) {
      console.error("Failed to update assignment:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update assignment, please try again later",
          "error"
        );
    }
  },

  deleteAssignment: async (assignmentId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlAssignment}/${assignmentId}/teams/${teamId}`,
        {
          method: "DELETE",
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete assignment: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        assignments: state.assignments.filter((s) => s.id !== assignmentId),
      }));
    } catch (error) {
      console.error("Failed to delete assignment:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete assignment, please try again later",
          "error"
        );
    }
  },

  deleteAStoreWithScheduleId: (scheduleId) => {
    set((state) => ({
      assignments: state.assignments.filter((a) => a.scheduleId !== scheduleId),
    }));
  },
}));
