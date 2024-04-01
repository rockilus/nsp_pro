import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { ConstraintT } from "../components/Constraint/types";

const apiUrlConstraints = process.env.NEXT_PUBLIC_API_URL + "/constraints";

type ConstraintStateT = {
  constraints: ConstraintT[];
  fetchConstraints: (teamId: string) => void;
  addConstraint: (constraint: ConstraintT) => void;
  updateConstraint: (updatedConstraint: ConstraintT) => void;
  deleteConstraint: (constraintId: string, teamId: string) => void;
};

export const useConstraintStore = create<ConstraintStateT>()((set) => ({
  constraints: [],

  fetchConstraints: async (teamId) => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(
        `${apiUrlConstraints}/teams/${teamId}`,
        options
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch constraints: " + responseData.detail,
            "error"
          );
        return;
      }
      const constraints: ConstraintT[] = responseData;
      set({ constraints });
    } catch (error) {
      console.error("Failed to fetch constraints:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch constraints, please try again later",
          "error"
        );
    }
  },

  addConstraint: async (constraint) => {
    try {
      const response = await fetch(
        `${apiUrlConstraints}/teams/${constraint.teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(constraint),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add constraint: " + responseData.detail,
            "error"
          );
        return;
      }
      const newConstraint = responseData;
      set((state) => ({
        constraints: [...state.constraints, newConstraint],
      }));
    } catch (error) {
      console.error("Failed to add constraint:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add constraint, please try again later",
          "error"
        );
    }
  },

  updateConstraint: async (updatedConstraint) => {
    try {
      const response = await fetch(
        `${apiUrlConstraints}/${updatedConstraint.id}/teams/${updatedConstraint.teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedConstraint),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update constraint: " + responseData.detail,
            "error"
          );
        return;
      }
      const newConstraint: ConstraintT = responseData;
      set((state) => ({
        constraints: state.constraints.map((w) =>
          w.id === updatedConstraint.id ? newConstraint : w
        ),
      }));
    } catch (error) {
      console.error("Failed to update constraint:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update constraint, please try again later",
          "error"
        );
    }
  },

  deleteConstraint: async (constraintId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlConstraints}/${constraintId}/teams/${teamId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: constraintId }),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete constraint: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        constraints: state.constraints.filter((c) => c.id !== constraintId),
      }));
    } catch (error) {
      console.error("Failed to delete constraint:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete constraint, please try again later",
          "error"
        );
    }
  },
}));
