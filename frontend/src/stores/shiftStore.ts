// shiftStore.ts
import dayjs from "dayjs";

import { create } from "zustand";
import { ShiftT, ShiftPropertyT } from "../components/Shift/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlShifts = `${baseApiUrl}/shifts`;

type ShiftStateT = {
  shifts: ShiftT[];
  fetchShifts: () => void;
  addShift: () => void;
  updateShift: (updatedShift: ShiftT) => void;
  updateShiftProperty: (updatedShiftProperty: ShiftPropertyT) => void;
  deleteShift: (id: string) => void;
};

const toShiftT = (data: any): ShiftT => {
  return {
    ...data,
    startTime: dayjs.utc(data.startTime),
    endTime: dayjs.utc(data.endTime),
  };
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
      const response = await fetch(apiUrlShifts, options); // Adjust API endpoint as needed
      const data = await response.json();
      const shifts: ShiftT[] = data.map((shift: any) => toShiftT(shift));
      set({ shifts });
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    }
  },

  // Here I keep POST for the convention, but there is no body
  addShift: async () => {
    try {
      const response = await fetch(apiUrlShifts, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      const newShift: ShiftT = toShiftT(data);
      set((state) => ({ shifts: [...state.shifts, newShift] }));
    } catch (error) {
      console.error("Failed to add shift:", error);
    }
  },

  updateShift: async (updatedShift) => {
    try {
      const response = await fetch(`${apiUrlShifts}/${updatedShift.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedShift),
      });
      const data = await response.json();
      const newShift: ShiftT = toShiftT(data);
      set((state) => ({
        shifts: state.shifts.map((s) => (s.id === newShift.id ? newShift : s)),
      }));
    } catch (error) {
      console.error("Failed to update shift:", error);
    }
  },

  updateShiftProperty: async (updatedShiftProperty) => {
    try {
      const response = await fetch(
        `${apiUrlShifts}/${updatedShiftProperty.shiftId}/properties/${updatedShiftProperty.shiftDimensionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedShiftProperty.value),
        }
      );
      const newShiftProperty: ShiftPropertyT = await response.json();
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
      await fetch(`${apiUrlShifts}/${id}`, {
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
