import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { CoverageT, ShiftDemandT } from "../components/Coverage/types";
import { toShiftT } from "./shiftStore";

dayjs.extend(utc);

const apiUrlCoverages = process.env.NEXT_PUBLIC_API_URL + "/coverages";

type CoverageStateT = {
  coverages: CoverageT[];
  fetchCoverages: (teamId: string) => void;
  addCoverage: (coverage: CoverageT) => Promise<CoverageT | null>;
  addShiftDemand: (shiftDemand: ShiftDemandT, teamId: string) => void;
  updateCoverage: (updatedCoverage: CoverageT) => void;
  updateShiftDemand: (updatedShiftDemand: ShiftDemandT, teamId: string) => void;
  deleteCoverage: (coverageId: string, teamId: string) => void;
  deleteShiftDemand: (
    coverageId: string,
    shiftDemandId: string,
    teamId: string
  ) => void;
};

export const useCoverageStore = create<CoverageStateT>()((set) => ({
  coverages: [],

  fetchCoverages: async (teamId) => {
    try {
      const response = await fetch(`${apiUrlCoverages}/teams/${teamId}`);
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch coverages: " + responseData.detail,
            "error"
          );
        return;
      }
      const coverages: CoverageT[] = responseData.map(
        (coverage: CoverageT) => ({
          ...coverage,
          shiftDemands: coverage.shiftDemands.map((shiftDemand) => ({
            ...shiftDemand,
            shift: toShiftT(shiftDemand.shift),
          })),
        })
      );
      set({ coverages });
    } catch (error) {
      console.error("Failed to fetch coverages:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch coverages, please try again later",
          "error"
        );
    }
  },

  addCoverage: async (coverage) => {
    try {
      const response = await fetch(
        `${apiUrlCoverages}/teams/${coverage.teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(coverage),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add coverage: " + responseData.detail,
            "error"
          );
        return null;
      }
      const newCoverage: CoverageT = {
        ...responseData,
        shiftDemands: responseData.shiftDemands.map(
          (shiftDemand: ShiftDemandT) => ({
            ...shiftDemand,
            shift: toShiftT(shiftDemand.shift),
          })
        ),
      };
      set((state) => ({ coverages: [...state.coverages, newCoverage] }));
      return newCoverage;
    } catch (error) {
      console.error("Failed to add coverage:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add coverage, please try again later",
          "error"
        );
      return null;
    }
  },

  addShiftDemand: async (shiftDemand, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlCoverages}/${shiftDemand.coverageId}/shift_demands/teams/${teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shiftDemand),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add shift demand: " + responseData.detail,
            "error"
          );
        return;
      }
      const newShiftDemand: ShiftDemandT = {
        ...responseData,
        shift: toShiftT(responseData.shift),
      };
      set((state) => ({
        coverages: state.coverages.map((coverage) =>
          coverage.id === newShiftDemand.coverageId
            ? {
                ...coverage,
                shiftDemands: [...coverage.shiftDemands, newShiftDemand],
              }
            : coverage
        ),
      }));
    } catch (error) {
      console.error("Failed to add shift demand:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add shift demand, please try again later",
          "error"
        );
    }
  },

  updateCoverage: async (updatedCoverage) => {
    try {
      const response = await fetch(
        `${apiUrlCoverages}/${updatedCoverage.id}/teams/${updatedCoverage.teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedCoverage),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update coverage: " + responseData.detail,
            "error"
          );
        return;
      }
      const newCoverage: CoverageT = {
        ...responseData,
        shiftDemands: responseData.shiftDemands.map(
          (shiftDemand: ShiftDemandT) => ({
            ...shiftDemand,
            shift: toShiftT(shiftDemand.shift),
          })
        ),
      };
      set((state) => ({
        coverages: state.coverages.map((c) =>
          c.id === newCoverage.id ? newCoverage : c
        ),
      }));
    } catch (error) {
      console.error("Failed to update coverage:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update coverage, please try again later",
          "error"
        );
    }
  },

  updateShiftDemand: async (updatedShiftDemand, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlCoverages}/${updatedShiftDemand.coverageId}/shift_demands/${updatedShiftDemand.id}/teams/${teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedShiftDemand),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update shift demand: " + responseData.detail,
            "error"
          );
        return;
      }
      const newShiftDemand: ShiftDemandT = {
        ...responseData,
        shift: toShiftT(responseData.shift),
      };
      set((state) => ({
        coverages: state.coverages.map((coverage) =>
          coverage.id === newShiftDemand.coverageId
            ? {
                ...coverage,
                shiftDemands: coverage.shiftDemands.some(
                  (shiftDemand) => shiftDemand.id === newShiftDemand.id
                )
                  ? coverage.shiftDemands.map((shiftDemand) =>
                      shiftDemand.id === newShiftDemand.id
                        ? newShiftDemand
                        : shiftDemand
                    )
                  : [...coverage.shiftDemands, newShiftDemand],
              }
            : coverage
        ),
      }));
    } catch (error) {
      console.error("Failed to update shift demand:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update shift demand, please try again later",
          "error"
        );
    }
  },

  deleteCoverage: async (coverageId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlCoverages}/${coverageId}/teams/${teamId}`,
        {
          method: "DELETE",
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete coverage: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        coverages: state.coverages.filter((c) => c.id !== coverageId),
      }));
    } catch (error) {
      console.error("Failed to delete coverage:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete coverage, please try again later",
          "error"
        );
    }
  },

  deleteShiftDemand: async (coverageId, shiftDemandId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlCoverages}/${coverageId}/shift_demands/${shiftDemandId}/teams/${teamId}`,
        {
          method: "DELETE",
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete shift demand: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        coverages: state.coverages.map((coverage) =>
          coverage.id === coverageId
            ? {
                ...coverage,
                shiftDemands: coverage.shiftDemands.filter(
                  (shiftDemand) => shiftDemand.id !== shiftDemandId
                ),
              }
            : coverage
        ),
      }));
    } catch (error) {
      console.error("Failed to delete shift demand:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete shift demand, please try again later",
          "error"
        );
    }
  },
}));
