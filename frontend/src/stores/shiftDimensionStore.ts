// shiftDimensionStore.ts
import { create } from "zustand";
import { ShiftDimensionT } from "../components/Shift/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlShiftDimensions = `${baseApiUrl}/shift-dimensions`;

type ShiftDimensionStateT = {
  shiftDimensions: ShiftDimensionT[];
  fetchShiftDimensions: () => void;
  addShiftDimension: (ShiftDimension: ShiftDimensionT) => void;
  updateShiftDimension: (updatedShiftDimension: ShiftDimensionT) => void;
  deleteShiftDimension: (id: string) => void;
};

export const useShiftDimensionStore = create<ShiftDimensionStateT>()((set) => ({
  shiftDimensions: [],

  fetchShiftDimensions: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlShiftDimensions, options); // Adjust API endpoint as needed
      const shiftDimensions: ShiftDimensionT[] = await response.json();
      set({ shiftDimensions });
    } catch (error) {
      console.error("Failed to fetch shiftDimensions:", error);
    }
  },

  // Here I keep POST for the convention, but there is no body
  addShiftDimension: async (shiftDimension) => {
    try {
      const response = await fetch(apiUrlShiftDimensions, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shiftDimension),
      });
      const newShiftDimension: ShiftDimensionT = await response.json();
      set((state) => ({
        shiftDimensions: [...state.shiftDimensions, newShiftDimension],
      }));
    } catch (error) {
      console.error("Failed to add shiftDimension:", error);
    }
  },

  updateShiftDimension: async (updatedShiftDimension) => {
    try {
      const response = await fetch(
        `${apiUrlShiftDimensions}/${updatedShiftDimension.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedShiftDimension),
        }
      );
      const newShiftDimension: ShiftDimensionT = await response.json();
      set((state) => ({
        shiftDimensions: state.shiftDimensions.map((shiftDimension) =>
          shiftDimension.id === newShiftDimension.id
            ? newShiftDimension
            : shiftDimension
        ),
      }));
    } catch (error) {
      console.error("Failed to update shiftDimension:", error);
    }
  },

  deleteShiftDimension: async (id) => {
    try {
      await fetch(`${apiUrlShiftDimensions}/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      set((state) => ({
        shiftDimensions: state.shiftDimensions.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete shiftDimension:", error);
    }
  },
}));
