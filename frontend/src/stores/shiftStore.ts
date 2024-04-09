import dayjs from "dayjs";
import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { ShiftT, ShiftPropertyT } from "../components/Shift/types";

const apiUrlShifts = process.env.NEXT_PUBLIC_API_URL + "/shifts";

type ShiftStateT = {
  shifts: ShiftT[];
  fetchShifts: (teamId: string) => void;
  addShift: (shift: ShiftT) => void;
  addPropertiesToStore: (newProperties: ShiftPropertyT[]) => void;
  updateShift: (updatedShift: ShiftT) => void;
  updateShiftProperty: (
    teamId: string,
    updatedShiftProperty: ShiftPropertyT
  ) => void;
  deleteShift: (shiftId: string, teamId: string) => void;
};

export const toShiftT = (data: any): ShiftT => {
  return {
    ...data,
    startTime: dayjs.utc(data.startTime),
    endTime: dayjs.utc(data.endTime),
  };
};

export const useShiftStore = create<ShiftStateT>()((set) => ({
  shifts: [],

  fetchShifts: async (teamId) => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(`${apiUrlShifts}/teams/${teamId}`, options);
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch shifts: " + responseData.detail,
            "error"
          );
        return;
      }
      const shifts: ShiftT[] = responseData.map((shift: any) =>
        toShiftT(shift)
      );
      set({ shifts });
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch shifts, please try again later",
          "error"
        );
    }
  },

  addShift: async (shift) => {
    try {
      const response = await fetch(`${apiUrlShifts}/teams/${shift.teamId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shift),
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add shift: " + responseData.detail,
            "error"
          );
        return;
      }
      const newShift: ShiftT = toShiftT(responseData);
      set((state) => ({ shifts: [...state.shifts, newShift] }));
    } catch (error) {
      console.error("Failed to add shift:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar("Failed to add shift, please try again later", "error");
    }
  },

  addPropertiesToStore: (newProperties) => {
    set((state) => ({
      shifts: state.shifts.map((shift) => {
        const newShiftProperties = newProperties.filter(
          (property) => property.shiftId === shift.id
        );

        return newShiftProperties
          ? {
              ...shift,
              shiftProperties: [
                ...shift.shiftProperties,
                ...newShiftProperties,
              ],
            }
          : shift;
      }),
    }));
  },

  updateShift: async (updatedShift) => {
    try {
      const response = await fetch(
        `${apiUrlShifts}/${updatedShift.id}/teams/${updatedShift.teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedShift),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update shift: " + responseData.detail,
            "error"
          );
        return;
      }
      const newShift: ShiftT = toShiftT(responseData);
      set((state) => ({
        shifts: state.shifts.map((s) => (s.id === newShift.id ? newShift : s)),
      }));
    } catch (error) {
      console.error("Failed to update shift:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update shift, please try again later",
          "error"
        );
    }
  },

  updateShiftProperty: async (teamId, updatedShiftProperty) => {
    try {
      const response = await fetch(
        `${apiUrlShifts}/${updatedShiftProperty.shiftId}/properties/${updatedShiftProperty.shiftDimensionId}/teams/${teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedShiftProperty),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update shift property: " + responseData.detail,
            "error"
          );
        return;
      }
      const newShiftProperty: ShiftPropertyT = responseData;
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
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update shift property, please try again later",
          "error"
        );
    }
  },

  deleteShift: async (shiftId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlShifts}/${shiftId}/teams/${teamId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ shiftId, teamId }),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete shift: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        shifts: state.shifts.filter((c) => c.id !== shiftId),
      }));
    } catch (error) {
      console.error("Failed to delete shift:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete shift, please try again later",
          "error"
        );
    }
  },
}));
