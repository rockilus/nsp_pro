// fixedAssignmentStore.ts
import { create } from "zustand";
import { FixedAssignmentT } from "../components/FixedAssignmentRequest/types";

// const baseApiUrl = "http://localhost:5000";
const baseApiUrl = "http://127.0.0.1:5000";

// FixedAssignment
const apiUrlFixedAssignments = `${baseApiUrl}/fixed-assignments`;

type FixedAssignmentStateT = {
  fixedAssignments: FixedAssignmentT[];
  fetchFixedAssignments: () => void;
  addFixedAssignment: (
    fixedAssignment: FixedAssignmentT
  ) => Promise<FixedAssignmentT>;
  updateFixedAssignment: (updatedFixedAssignment: FixedAssignmentT) => void;
  deleteFixedAssignment: (id: string) => void;
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

    fetchFixedAssignments: async () => {
      try {
        const response = await fetch(apiUrlFixedAssignments, {
          method: "GET",
          credentials: "include" as RequestCredentials,
          headers: {
            "Content-Type": "application/json",
          },
        }); // Adjust API endpoint as needed
        const data = await response.json();
        const fixedAssignments = data.map(toFixedAssignmentT);
        set({ fixedAssignments });
      } catch (error) {
        console.error("Failed to fetch fixedAssignments:", error);
      }
    },

    addFixedAssignment: async (fixedAssignment) => {
      try {
        const response = await fetch(apiUrlFixedAssignments, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fixedAssignment),
        });
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

    updateFixedAssignment: async (updatedFixedAssignment) => {
      try {
        await fetch(`${apiUrlFixedAssignments}/${updatedFixedAssignment.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedFixedAssignment),
        });
        set((state) => ({
          fixedAssignments: state.fixedAssignments.map((fa) =>
            fa.id === updatedFixedAssignment.id ? updatedFixedAssignment : fa
          ),
        }));
      } catch (error) {
        console.error("Failed to update fixedAssignment:", error);
      }
    },

    deleteFixedAssignment: async (id) => {
      try {
        await fetch(`${apiUrlFixedAssignments}/${id}`, {
          method: "DELETE",
        });
        set((state) => ({
          fixedAssignments: state.fixedAssignments.filter((fa) => fa.id !== id),
        }));
      } catch (error) {
        console.error("Failed to delete fixedAssignment:", error);
      }
    },
  })
);
