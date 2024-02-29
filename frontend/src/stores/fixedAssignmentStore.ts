// fixedAssignmentStore.ts
import { create } from "zustand";
// Types
import { FixedAssignmentT } from "../components/FixedAssignmentRequest/types";
// Constants
import { ApiUrl } from "../utils/env_config";

const apiUrlFixedAssignments = ApiUrl + "/fixed-assignments";

type FixedAssignmentStateT = {
  fixedAssignments: FixedAssignmentT[];
  fetchFixedAssignments: (teamId: string) => void;
  addFixedAssignment: (
    fixedAssignment: FixedAssignmentT,
    teamId: string
  ) => Promise<FixedAssignmentT>;
  updateFixedAssignment: (
    updatedFixedAssignment: FixedAssignmentT,
    teamId: string
  ) => void;
  deleteFixedAssignment: (fixedAssignmentId: string, teamId: string) => void;
};

const toFixedAssignmentT = (data: any) => {
  const fa: FixedAssignmentT = {
    ...data,
    date: new Date(data.date),
  };
  return fa;
};

export const useFixedAssignmentStore = create<FixedAssignmentStateT>()(
  (set) => ({
    fixedAssignments: [],

    fetchFixedAssignments: async (teamId) => {
      try {
        const response = await fetch(
          `${apiUrlFixedAssignments}/teams/${teamId}`,
          {
            method: "GET",
            credentials: "include" as RequestCredentials,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch fixedAssignments: ${response.status}`
          );
        }
        const data = await response.json();
        const fixedAssignments = data.map(toFixedAssignmentT);
        set({ fixedAssignments });
      } catch (error) {
        console.error("Failed to fetch fixedAssignments:", error);
      }
    },

    addFixedAssignment: async (fixedAssignment, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlFixedAssignments}/teams/${teamId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(fixedAssignment),
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to add fixedAssignment: ${response.status}`);
        }
        const data = await response.json();
        const newFixedAssignment = toFixedAssignmentT(data);
        set((state) => ({
          fixedAssignments: [...state.fixedAssignments, newFixedAssignment],
        }));
        return newFixedAssignment;
      } catch (error) {
        throw Error(`Failed to add fixedAssignment: ${error}`);
      }
    },

    updateFixedAssignment: async (updatedFixedAssignment, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlFixedAssignments}/${updatedFixedAssignment.id}/teams/${teamId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedFixedAssignment),
          }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to update fixedAssignment: ${response.status}`
          );
        }
        set((state) => ({
          fixedAssignments: state.fixedAssignments.map((fa) =>
            fa.id === updatedFixedAssignment.id ? updatedFixedAssignment : fa
          ),
        }));
      } catch (error) {
        console.error("Failed to update fixedAssignment:", error);
      }
    },

    deleteFixedAssignment: async (fixedAssignmentId, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlFixedAssignments}/${fixedAssignmentId}/teams/${teamId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to delete fixedAssignment: ${response.status}`
          );
        }
        set((state) => ({
          fixedAssignments: state.fixedAssignments.filter(
            (fa) => fa.id !== fixedAssignmentId
          ),
        }));
      } catch (error) {
        console.error("Failed to delete fixedAssignment:", error);
      }
    },
  })
);
