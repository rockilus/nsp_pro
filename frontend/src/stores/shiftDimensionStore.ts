// shiftDimensionStore.ts
import { create } from "zustand";
import { ShiftDimensionT, NewShiftDimensionT } from "../components/Shift/types";
import { useShiftStore } from "./shiftStore";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlShiftDimensions = `${baseApiUrl}/shift-dimensions`;

type ShiftDimensionStateT = {
  shiftDimensions: ShiftDimensionT[];
  fetchShiftDimensions: (teamId: string) => void;
  addShiftDimension: (ShiftDimension: ShiftDimensionT) => void;
  updateShiftDimension: (updatedShiftDimension: ShiftDimensionT) => void;
  deleteShiftDimension: (shiftDimensionId: string, teamId: string) => void;
};

export const useShiftDimensionStore = create<ShiftDimensionStateT>()((set) => ({
  shiftDimensions: [],

  fetchShiftDimensions: async (teamId) => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(
        `${apiUrlShiftDimensions}/teams/${teamId}`,
        options
      );
      if (!response.ok) {
        console.log("Failed to fetch shiftDimensions", response);
        throw new Error("Failed to fetch shiftDimensions");
      }
      const shiftDimensions: ShiftDimensionT[] = await response.json();
      set({ shiftDimensions });
    } catch (error) {
      console.error("Failed to fetch shiftDimensions:", error);
    }
  },

  addShiftDimension: async (shiftDimension) => {
    try {
      const response = await fetch(
        `${apiUrlShiftDimensions}/teams/${shiftDimension.teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shiftDimension),
        }
      );
      if (!response.ok) {
        console.log("Failed to add shiftDimension", response);
        throw new Error("Failed to add shiftDimension");
      }
      const data = await response.json();
      const newShiftDimension: NewShiftDimensionT = data;
      set((state) => ({
        shiftDimensions: [
          ...state.shiftDimensions,
          newShiftDimension.newDimension,
        ],
      }));
      useShiftStore
        .getState()
        .addPropertiesToStore(newShiftDimension.newProperties);
    } catch (error) {
      console.error("Failed to add shiftDimension:", error);
    }
  },

  updateShiftDimension: async (updatedShiftDimension) => {
    try {
      const response = await fetch(
        `${apiUrlShiftDimensions}/${updatedShiftDimension.id}/teams/${updatedShiftDimension.teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedShiftDimension),
        }
      );
      if (!response.ok) {
        console.log("Failed to update shiftDimension", response);
        throw new Error("Failed to update shiftDimension");
      }
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

  deleteShiftDimension: async (shiftDimensionId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlShiftDimensions}/${shiftDimensionId}/teams/${teamId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ shiftDimensionId, teamId }),
        }
      );
      if (!response.ok) {
        console.log("Failed to delete shiftDimension", response);
        throw new Error("Failed to delete shiftDimension");
      }
      set((state) => ({
        shiftDimensions: state.shiftDimensions.filter(
          (c) => c.id !== shiftDimensionId
        ),
      }));
    } catch (error) {
      console.error("Failed to delete shiftDimension:", error);
    }
  },
}));
