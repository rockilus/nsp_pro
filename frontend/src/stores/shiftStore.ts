// shiftStore.ts
import { create } from "zustand";
import { ShiftT, ShiftPropertyT } from "../components/Shift/types";

const baseApiUrl = "http://127.0.0.1:5000";

// Shift
// const apiUrlShifts = `${baseApiUrl}/shifts`;

// WITH OLD API
// Shift
const createShiftUrl = baseApiUrl + "/shifts";
const getShiftsUrl = baseApiUrl + "/shifts";
const deleteShiftUrl = (shiftId: string) => `${baseApiUrl}/shifts/${shiftId}`;

// Shift Property
const updateShiftPropertyUrl = (shiftId: string, shiftDimensionId: string) => `${baseApiUrl}/shifts/${shiftId}/properties/${shiftDimensionId}`;

type ShiftStateT = {
  shifts: ShiftT[];
  fetchShifts: () => void;
  addShift: () => void;
  updateShiftProperty: (updatedShiftProperty: ShiftPropertyT) => void;
  deleteShift: (id: string) => void;
};

export const useShiftStore = create<ShiftStateT>()((set) => ({
  shifts: [],

  fetchShifts: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(getShiftsUrl, options); // Adjust API endpoint as needed
      const data = await response.json();
      const shifts = data; //check if this works
      set({ shifts });
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    }
  },

  // Here I keep POST for the convention, but there is no body
  addShift: async () => {
    try {
      const response = await fetch(createShiftUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      const newShift: ShiftT = data; // check if this works
      set((state) => ({ shifts: [...state.shifts, newShift] }));
    } catch (error) {
      console.error("Failed to add shift:", error);
    }
  },

  updateShiftProperty: async (updatedShiftProperty) => {
    try {
      const response = await fetch(updateShiftPropertyUrl(updatedShiftProperty.shiftId, updatedShiftProperty.shiftDimensionId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedShiftProperty.value),
      });
      const data = await response.json();
      const newShiftProperty: ShiftPropertyT = data; // check if this works
      set((state) => ({
        shifts: state.shifts.map((shift) =>
          shift.id === newShiftProperty.shiftId
            ? {
                ...shift,
                shiftProperties: shift.shiftProperties.some(
                  (shiftProperty) => shiftProperty.id === newShiftProperty.id
                )
                  ? shift.shiftProperties.map((shiftProperty) =>
                      shiftProperty.id === newShiftProperty.id
                        ? newShiftProperty
                        : shiftProperty
                    )
                  : [...shift.shiftProperties, newShiftProperty],
              }
            : shift
        ),
      }));
    } catch (error) {
      console.error("Failed to update shift:", error);
    }
  },

  deleteShift: async (id) => {
    try {
      await fetch(deleteShiftUrl(id), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      set((state) => ({
        shifts: state.shifts.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete shift:", error);
    }
  },
}));
