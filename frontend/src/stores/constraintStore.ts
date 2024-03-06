import { create } from "zustand";
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
      if (!response.ok) {
        throw Error(`Failed to fetch constraints: ${response.statusText}`);
      }
      const constraints: ConstraintT[] = await response.json();
      set({ constraints });
    } catch (error) {
      console.error("Failed to fetch constraints:", error);
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
      if (!response.ok) {
        throw Error(`Failed to add constraint: ${response.statusText}`);
      }
      const newConstraint = await response.json();
      set((state) => ({
        constraints: [...state.constraints, newConstraint],
      }));
    } catch (error) {
      throw Error(`Failed to add constraint: ${error}`);
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
      if (!response.ok) {
        throw Error(`Failed to update constraint: ${response.statusText}`);
      }
      const newConstraint: ConstraintT = await response.json();
      set((state) => ({
        constraints: state.constraints.map((w) =>
          w.id === updatedConstraint.id ? newConstraint : w
        ),
      }));
    } catch (error) {
      console.error("Failed to update constraint:", error);
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
      if (!response.ok) {
        throw Error(`Failed to delete constraint: ${response.statusText}`);
      }
      set((state) => ({
        constraints: state.constraints.filter((c) => c.id !== constraintId),
      }));
    } catch (error) {
      console.error("Failed to delete constraint:", error);
    }
  },
}));
