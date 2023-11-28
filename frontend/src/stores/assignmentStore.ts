import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { AssignmentT } from "../components/Schedule/types";

dayjs.extend(utc);

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlAssignment = baseApiUrl + "/assignments";

type AssignmentStateT = {
  assignments: AssignmentT[];
  fetchAssignments: () => void;
  addAssignment: (assignment: AssignmentT) => void;
  updateAssignmentStore: (updatedAssignments: AssignmentT[]) => void;
  updateAssignment: (updatedAssignment: AssignmentT) => void;
  deleteAssignment: (id: string) => void;
  deleteAStoreWithScheduleId: (id: string) => void;
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

  fetchAssignments: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlAssignment, options);
      const data = await response.json();
      console.log("data", data);

      const assignments: AssignmentT[] = data.map(toAssignmentT);
      set({ assignments });
    } catch (error) {
      console.error("Failed to fetch assignment:", error);
    }
  },

  addAssignment: async (assignment) => {
    try {
      const response = await fetch(apiUrlAssignment, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignment),
      });
      const data = await response.json();
      const newAssignment: AssignmentT = toAssignmentT(data);
      set((state) => ({
        assignments: [...state.assignments, newAssignment],
      }));
    } catch (error) {
      throw Error(`Failed to add assignment: ${error}`);
    }
  },

  updateAssignmentStore: (updatedAssignments) => {
    // console.log("updatedAssignments", updatedAssignments);
    updatedAssignments.forEach((updatedAssignment) => {
      //   console.log("updatedAssignment", updatedAssignment);

      set((state) => ({
        assignments: state.assignments.find(
          (s) => s.id === updatedAssignment.id
        )
          ? state.assignments.map((s) =>
              s.id === updatedAssignment.id ? updatedAssignment : s
            )
          : [...state.assignments, updatedAssignment],
      }));
    });
  },

  updateAssignment: async (updatedAssignment) => {
    try {
      const response = await fetch(
        `${apiUrlAssignment}/${updatedAssignment.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedAssignment),
        }
      );
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

  deleteAssignment: async (id) => {
    try {
      await fetch(`${apiUrlAssignment}/${id}`, {
        method: "DELETE",
      });
      set((state) => ({
        assignments: state.assignments.filter((s) => s.id !== id),
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
