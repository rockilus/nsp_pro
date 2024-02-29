import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Types
import { AssignmentT } from "../components/Schedule/types";
// Constants
import { ApiUrl } from "../utils/env_config";

dayjs.extend(utc);

const apiUrlAssignment = ApiUrl + "/assignments";

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
      if (!response.ok) {
        throw new Error("Failed to fetch assignments");
      }
      const data = await response.json();
      const assignments: AssignmentT[] = data.map(toAssignmentT);
      set({ assignments });
    } catch (error) {
      console.error("Failed to fetch assignment:", error);
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
      if (!response.ok) {
        throw new Error("Failed to add assignment");
      }
      const data = await response.json();
      const newAssignment: AssignmentT = toAssignmentT(data);
      set((state) => ({
        assignments: [...state.assignments, newAssignment],
      }));
    } catch (error) {
      throw Error(`Failed to add assignment: ${error}`);
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
      if (!response.ok) {
        throw new Error("Failed to update assignment");
      }
      const data = await response.json();
      const newAssignment: AssignmentT = toAssignmentT(data);
      set((state) => ({
        assignments: state.assignments.map((s) =>
          s.id === newAssignment.id ? newAssignment : s
        ),
      }));
    } catch (error) {
      console.error("Failed to update assignment:", error);
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
      if (!response.ok) {
        throw new Error("Failed to delete assignment");
      }
      set((state) => ({
        assignments: state.assignments.filter((s) => s.id !== assignmentId),
      }));
    } catch (error) {
      console.error("Failed to delete assignment:", error);
    }
  },

  deleteAStoreWithScheduleId: (scheduleId) => {
    set((state) => ({
      assignments: state.assignments.filter((a) => a.scheduleId !== scheduleId),
    }));
  },
}));
