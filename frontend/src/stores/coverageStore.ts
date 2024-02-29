import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Types
import { CoverageT, ShiftDemandT } from "../components/Coverage/types";
import { ShiftDefaultT } from "../components/Shift/types";
// Constants
import { ApiUrl } from "../utils/env_config";

dayjs.extend(utc);

const apiUrlCoverages = ApiUrl + "/coverages";

type CoverageStateT = {
  coverages: CoverageT[];
  fetchCoverages: (teamId: string) => void;
  addCoverage: (coverage: CoverageT) => Promise<CoverageT>;
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

const toShiftDefaultT = (data: any): ShiftDefaultT => {
  return {
    ...data,
    startTime: dayjs.utc(data.startTime),
    endTime: dayjs.utc(data.endTime),
  };
};

export const useCoverageStore = create<CoverageStateT>()((set) => ({
  coverages: [],

  fetchCoverages: async (teamId) => {
    try {
      const response = await fetch(`${apiUrlCoverages}/teams/${teamId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch coverages");
      }
      const data = await response.json();
      const coverages: CoverageT[] = data.map((coverage: CoverageT) => ({
        ...coverage,
        shiftDemands: coverage.shiftDemands.map((shiftDemand) => ({
          ...shiftDemand,
          shift: toShiftDefaultT(shiftDemand.shift),
        })),
      }));
      set({ coverages });
    } catch (error) {
      console.error("Failed to fetch coverages:", error);
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
      if (!response.ok) {
        throw new Error("Failed to add coverage");
      }
      const data = await response.json();
      const newCoverage: CoverageT = {
        ...data,
        shiftDemands: data.shiftDemands.map((shiftDemand: ShiftDemandT) => ({
          ...shiftDemand,
          shift: toShiftDefaultT(shiftDemand.shift),
        })),
      };
      set((state) => ({ coverages: [...state.coverages, newCoverage] }));
      return newCoverage;
    } catch (error) {
      throw Error(`Failed to add coverage: ${error}`);
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
      if (!response.ok) {
        throw new Error("Failed to add shift demand");
      }
      const data = await response.json();
      const newShiftDemand: ShiftDemandT = {
        ...data,
        shift: toShiftDefaultT(data.shift),
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
      throw Error(`Failed to add shift demand: ${error}`);
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
      if (!response.ok) {
        throw new Error("Failed to update coverage");
      }
      const data = await response.json();
      const newCoverage: CoverageT = {
        ...data,
        shiftDemands: data.shiftDemands.map((shiftDemand: ShiftDemandT) => ({
          ...shiftDemand,
          shift: toShiftDefaultT(shiftDemand.shift),
        })),
      };
      set((state) => ({
        coverages: state.coverages.map((c) =>
          c.id === newCoverage.id ? newCoverage : c
        ),
      }));
    } catch (error) {
      console.error("Failed to update coverage:", error);
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
      if (!response.ok) {
        throw new Error("Failed to update shift demand");
      }
      const data = await response.json();
      const newShiftDemand: ShiftDemandT = {
        ...data,
        shift: toShiftDefaultT(data.shift),
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
      if (!response.ok) {
        throw new Error("Failed to delete coverage");
      }
      set((state) => ({
        coverages: state.coverages.filter((c) => c.id !== coverageId),
      }));
    } catch (error) {
      console.error("Failed to delete coverage:", error);
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
      if (!response.ok) {
        throw new Error("Failed to delete shift demand");
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
    }
  },
}));
