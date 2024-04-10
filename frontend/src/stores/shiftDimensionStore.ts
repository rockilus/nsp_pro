import { create } from "zustand";
// Stores
import { useShiftStore } from "./shiftStore";
import { useSnackBarStore } from "./snackbarStore";
// Types
import { ShiftDimensionT, NewShiftDimensionT } from "../components/Shift/types";

const apiUrlShiftDimensions =
  process.env.NEXT_PUBLIC_API_URL + "/shift-dimensions";

type ShiftDimensionStateT = {
  shiftDimensions: ShiftDimensionT[];
  fetchShiftDimensions: (teamId: string) => void;
  fetchShiftDimensionsStore: (shiftDimensions: ShiftDimensionT[]) => void;
  addShiftDimension: (ShiftDimension: ShiftDimensionT) => Promise<boolean>;
  updateShiftDimension: (
    updatedShiftDimension: ShiftDimensionT
  ) => Promise<boolean>;
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch shift dimensions: " + responseData.detail,
            "error"
          );
        return;
      }
      const shiftDimensions: ShiftDimensionT[] = responseData;
      set({ shiftDimensions });
    } catch (error) {
      console.error("Failed to fetch shiftDimensions:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch shift dimensions, please try again later",
          "error"
        );
    }
  },

  fetchShiftDimensionsStore: (shiftDimensions) => {
    set({ shiftDimensions });
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add shift dimension: " + responseData.detail,
            "error"
          );
        return false;
      }
      const newShiftDimension: NewShiftDimensionT = responseData;
      set((state) => ({
        shiftDimensions: [
          ...state.shiftDimensions,
          newShiftDimension.newDimension,
        ],
      }));
      useShiftStore
        .getState()
        .addPropertiesToStore(newShiftDimension.newProperties);
      return true;
    } catch (error) {
      console.error("Failed to add shiftDimension:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add shift dimension, please try again later",
          "error"
        );
      return false;
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update shift dimension: " + responseData.detail,
            "error"
          );
        return false;
      }
      const newShiftDimension: ShiftDimensionT = responseData;
      set((state) => ({
        shiftDimensions: state.shiftDimensions.map((shiftDimension) =>
          shiftDimension.id === newShiftDimension.id
            ? newShiftDimension
            : shiftDimension
        ),
      }));
      return true;
    } catch (error) {
      console.error("Failed to update shiftDimension:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update shift dimension, please try again later",
          "error"
        );
      return false;
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete shift dimension: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        shiftDimensions: state.shiftDimensions.filter(
          (c) => c.id !== shiftDimensionId
        ),
      }));
    } catch (error) {
      console.error("Failed to delete shiftDimension:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete shift dimension, please try again later",
          "error"
        );
    }
  },
}));
