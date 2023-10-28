// constraintStore.ts
import { create } from "zustand";
import { ConstraintT } from "../components/Constraint/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlConstraints = baseApiUrl + "/constraints";

type ConstraintStateT = {
  constraints: ConstraintT[];
  fetchConstraints: () => void;
  addConstraint: (constraint: ConstraintT) => void;
  updateConstraint: (updatedConstraint: ConstraintT) => void;
  deleteConstraint: (id: string) => void;
};

export const useConstraintStore = create<ConstraintStateT>()((set) => ({
  constraints: [],

  fetchConstraints: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlConstraints, options); // Adjust API endpoint as needed
      const constraints: ConstraintT[] = await response.json();
      set({ constraints });
    } catch (error) {
      console.error("Failed to fetch constraints:", error);
    }
  },

  addConstraint: async (constraint) => {
    try {
      const response = await fetch(apiUrlConstraints, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(constraint),
      });
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
        `${apiUrlConstraints}/${updatedConstraint.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedConstraint),
        }
      );
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

  deleteConstraint: async (id) => {
    try {
      await fetch(`${apiUrlConstraints}/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      set((state) => ({
        constraints: state.constraints.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete constraint:", error);
    }
  },
}));
