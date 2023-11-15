// coverageStore.ts
import { create } from "zustand";
import { CoverageT } from "../components/Coverage/types";

// const baseApiUrl = "http://localhost:5000";
const baseApiUrl = "http://127.0.0.1:5000";

// Coverage
const apiUrlCoverages = `${baseApiUrl}/coverages`;

type CoverageStateT = {
  coverages: CoverageT[];
  fetchCoverages: () => void;
  addCoverage: (coverage: CoverageT) => Promise<CoverageT>;
  updateCoverage: (updatedCoverage: CoverageT) => void;
  deleteCoverage: (id: string) => void;
};

export const useCoverageStore = create<CoverageStateT>()((set) => ({
  coverages: [],

  fetchCoverages: async () => {
    try {
      const response = await fetch(apiUrlCoverages); // Adjust API endpoint as needed
      const coverages: CoverageT[] = await response.json();
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
      const newCoverage = await response.json();
      set((state) => ({ coverages: [...state.coverages, newCoverage] }));
      return newCoverage;
    } catch (error) {
      throw Error(`Failed to add coverage: ${error}`);
    }
  },

  updateCoverage: async (updatedCoverage) => {
    try {
      await fetch(`${apiUrlCoverages}/${updatedCoverage.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedCoverage),
      });
      set((state) => ({
        coverages: state.coverages.map((c) =>
          c.id === updatedCoverage.id ? updatedCoverage : c
        ),
      }));
    } catch (error) {
      console.error("Failed to update coverage:", error);
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
}));
