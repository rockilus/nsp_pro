import dayjs from "dayjs";
import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { ShiftT, ShiftPropertyT, RestShiftT } from "../components/Shift/types";

const apiUrlShifts = process.env.NEXT_PUBLIC_API_URL + "/shifts";
const apiUrlRestShifts = process.env.NEXT_PUBLIC_API_URL + "/rest-shifts";

type ShiftStateT = {
  shifts: ShiftT[];
  restShifts: RestShiftT[];
  fetchAllShifts: (teamId: string) => void;
  fetchShifts: (teamId: string) => void;
  fetchRestShifts: (teamId: string) => void;
  addShift: (shift: ShiftT) => void;
  addRestShift: (restShift: RestShiftT) => void;
  addPropertiesToStore: (newProperties: ShiftPropertyT[]) => void;
  updateShift: (updatedShift: ShiftT) => void;
  updateRestShift: (updatedShift: RestShiftT) => void;
  updateShiftProperty: (
    teamId: string,
    updatedShiftProperty: ShiftPropertyT
  ) => void;
  deleteShift: (shiftId: string, teamId: string) => void;
  deleteRestShift: (restShiftId: string, teamId: string) => void;
};

const toShiftT = (data: any): ShiftT => {
  return {
    ...data,
    startTime: dayjs.utc(data.startTime),
    endTime: dayjs.utc(data.endTime),
  };
};

const toShiftRestT = (data: any): RestShiftT => {
  return {
    ...data,
    startTime: dayjs.utc(data.startTime),
    endTime: dayjs.utc(data.endTime),
  };
};

export const useShiftStore = create<ShiftStateT>()((set) => ({
  shifts: [],
  restShifts: [],

  fetchAllShifts: async (teamId) => {
    await useShiftStore.getState().fetchShifts(teamId);
    await useShiftStore.getState().fetchRestShifts(teamId);
  },

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

  fetchRestShifts: async (teamId) => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(
        `${apiUrlRestShifts}/teams/${teamId}`,
        options
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch rest shifts: " + responseData.detail,
            "error"
          );
        return;
      }
      const shifts: RestShiftT[] = responseData.map((shift: any) =>
        toShiftRestT(shift)
      );
      set({ restShifts: shifts });
    } catch (error) {
      console.error("Failed to fetch rest shifts:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch rest shifts, please try again later",
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

  addRestShift: async (shift) => {
    try {
      const response = await fetch(
        `${apiUrlRestShifts}/teams/${shift.teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shift),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add rest shift: " + responseData.detail,
            "error"
          );
        return;
      }
      const newShift: RestShiftT = toShiftRestT(responseData);
      set((state) => ({ restShifts: [...state.restShifts, newShift] }));
    } catch (error) {
      console.error("Failed to add rest shift:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add rest shift, please try again later",
          "error"
        );
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

  updateRestShift: async (updatedShift) => {
    try {
      const response = await fetch(
        `${apiUrlRestShifts}/${updatedShift.id}/teams/${updatedShift.teamId}`,
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
            "Failed to update rest shift: " + responseData.detail,
            "error"
          );
        return;
      }
      const newShift: RestShiftT = toShiftRestT(responseData);
      set((state) => ({
        restShifts: state.restShifts.map((s) =>
          s.id === newShift.id ? newShift : s
        ),
      }));
    } catch (error) {
      console.error("Failed to update rest shift:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update rest shift, please try again later",
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

  deleteRestShift: async (shiftId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlRestShifts}/${shiftId}/teams/${teamId}`,
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
            "Failed to delete rest shift: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        restShifts: state.restShifts.filter((c) => c.id !== shiftId),
      }));
    } catch (error) {
      console.error("Failed to delete shift:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete rest shift, please try again later",
          "error"
        );
    }
  },
}));
