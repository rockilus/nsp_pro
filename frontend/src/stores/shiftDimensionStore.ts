// shiftDimensionStore.ts
import { create } from "zustand";
import { ShiftDimensionT } from "../components/Shift/types";

const baseApiUrl = "http://127.0.0.1:5000";

// ShiftDimension
// const apiUrlShiftDimensions = `${baseApiUrl}/shift-dimensions`;

// WITH OLD API
// Shift Dimension
const createShiftDimensionUrl = baseApiUrl + "/create-shift-param";
const getShiftDimensionsUrl = baseApiUrl + "/get-shift-params";
const updateShiftDimensionUrl = baseApiUrl + "/update-shift-param";
const deleteShiftDimensionUrl = baseApiUrl + "/delete-shift-param";

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
      const response = await fetch(getShiftDimensionsUrl, options); // Adjust API endpoint as needed
      const data = await response.json();
      const shiftDimensions = data; //check if this works
      set({ shiftDimensions });
    } catch (error) {
      console.error("Failed to fetch shiftDimensions:", error);
    }
  },

  // Here I keep POST for the convention, but there is no body
  addShiftDimension: async (shiftDimension) => {
    try {
      const response = await fetch(createShiftDimensionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shiftDimension),
      });
      const data = await response.json();
      const newShiftDimension: ShiftDimensionT = data; // check if this works
      set((state) => ({
        shiftDimensions: [...state.shiftDimensions, newShiftDimension],
      }));
    } catch (error) {
      console.error("Failed to add shiftDimension:", error);
    }
  },

  updateShiftDimension: async (updatedShiftDimension) => {
    try {
      const response = await fetch(updateShiftDimensionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedShiftDimension),
      });
      const data = await response.json();
      const newShiftDimension: ShiftDimensionT = data; // check if this works
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
      await fetch(deleteShiftDimensionUrl, {
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
