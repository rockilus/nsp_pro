import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { FixedAssignmentT } from "../components/FixedAssignmentRequest/types";

const apiUrlFixedAssignments =
  process.env.NEXT_PUBLIC_API_URL + "/fixed-assignments";

type FixedAssignmentStateT = {
  fixedAssignments: FixedAssignmentT[];
  fetchFixedAssignments: (teamId: string) => void;
  addFixedAssignment: (
    fixedAssignment: FixedAssignmentT,
    teamId: string
  ) => void;
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to fetch fixed assignments: " + responseData.detail,
              "error"
            );
          return;
        }
        const fixedAssignments = responseData.map(toFixedAssignmentT);
        set({ fixedAssignments });
      } catch (error) {
        console.error("Failed to fetch fixed assignments:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch fixed assignments, please try again later",
            "error"
          );
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to add fixed assignment: " + responseData.detail,
              "error"
            );
          return;
        }
        const newFixedAssignment = toFixedAssignmentT(responseData);
        set((state) => ({
          fixedAssignments: [...state.fixedAssignments, newFixedAssignment],
        }));
      } catch (error) {
        console.error("Failed to add fixed assignment:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add fixed assignment, please try again later",
            "error"
          );
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to update fixed assignment: " + responseData.detail,
              "error"
            );
          return;
        }
        set((state) => ({
          fixedAssignments: state.fixedAssignments.map((fa) =>
            fa.id === updatedFixedAssignment.id ? updatedFixedAssignment : fa
          ),
        }));
      } catch (error) {
        console.error("Failed to update fixed assignment:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update fixed assignment, please try again later",
            "error"
          );
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to delete fixed assignment: " + responseData.detail,
              "error"
            );
          return;
        }
        set((state) => ({
          fixedAssignments: state.fixedAssignments.filter(
            (fa) => fa.id !== fixedAssignmentId
          ),
        }));
      } catch (error) {
        console.error("Failed to delete fixedAssignment:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete fixed assignment, please try again later",
            "error"
          );
      }
    },
  })
);
