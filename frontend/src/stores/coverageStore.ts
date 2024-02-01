// coverageStore.ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
import { CoverageT, ShiftDemandT } from "../components/Coverage/types";
import { ShiftDefaultT } from "../components/Shift/types";

dayjs.extend(utc);

// const baseApiUrl = "http://localhost:5000";
const baseApiUrl = "http://127.0.0.1:5000";

// Coverage
const apiUrlCoverages = `${baseApiUrl}/coverages`;

type CoverageStateT = {
  coverages: CoverageT[];
  fetchCoverages: () => void;
  addCoverage: (coverage: CoverageT) => Promise<CoverageT>;
  addShiftDemand: (shiftDemand: ShiftDemandT) => void;
  updateCoverage: (updatedCoverage: CoverageT) => void;
  updateShiftDemand: (updatedShiftDemand: ShiftDemandT) => void;
  deleteCoverage: (id: string) => void;
  deleteShiftDemand: (coverageId: string, id: string) => void;
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

  fetchCoverages: async () => {
    try {
      const response = await fetch(apiUrlCoverages); // Adjust API endpoint as needed
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
      const response = await fetch(apiUrlCoverages, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(coverage),
      });
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

  addShiftDemand: async (shiftDemand) => {
    try {
      const response = await fetch(
        `${apiUrlCoverages}/${shiftDemand.coverageId}/shift_demands`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shiftDemand),
        }
      );
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
      const response = await fetch(`${apiUrlCoverages}/${updatedCoverage.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedCoverage),
      });
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

  updateShiftDemand: async (updatedShiftDemand) => {
    try {
      const response = await fetch(
        `${apiUrlCoverages}/${updatedShiftDemand.coverageId}/shift_demands/${updatedShiftDemand.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedShiftDemand),
        }
      );
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

  deleteCoverage: async (id) => {
    try {
      await fetch(`${apiUrlCoverages}/${id}`, {
        method: "DELETE",
      });
      set((state) => ({
        coverages: state.coverages.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete coverage:", error);
    }
  },

  deleteShiftDemand: async (coverageId, id) => {
    try {
      await fetch(`${apiUrlCoverages}/${coverageId}/shift_demands/${id}`, {
        method: "DELETE",
      });
      set((state) => ({
        coverages: state.coverages.map((coverage) =>
          coverage.id === coverageId
            ? {
                ...coverage,
                shiftDemands: coverage.shiftDemands.filter(
                  (shiftDemand) => shiftDemand.id !== id
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
