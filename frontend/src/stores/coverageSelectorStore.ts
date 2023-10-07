// coverageSelectorStore.ts
import { create } from "zustand";
import { CoverageSelectorT } from "../components/CoverageSelector/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlCoverageSelectors = `${baseApiUrl}/coverage-selectors`;

type CoverageSelectorStateT = {
  coverageSelectors: CoverageSelectorT[];
  fetchCoverageSelectors: () => void;
  addCoverageSelector: (
    coverageSelector: CoverageSelectorT
  ) => Promise<CoverageSelectorT>;
  updateCoverageSelector: (updatedCoverageSelector: CoverageSelectorT) => void;
  deleteCoverageSelector: (id: string) => void;
};

const toCoverageSelectorT = (data: any) => {
  const covSel: CoverageSelectorT = {
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
  };
  return covSel;
};

export const useCoverageSelectorStore = create<CoverageSelectorStateT>()(
  (set) => ({
    coverageSelectors: [],

    fetchCoverageSelectors: async () => {
      try {
        const response = await fetch(apiUrlCoverageSelectors); // Adjust API endpoint as needed
        const data = await response.json();
        const coverageSelectors = data.map(toCoverageSelectorT);
        set({ coverageSelectors });
      } catch (error) {
        console.error("Failed to fetch coverageSelectors:", error);
      }
    },

    addCoverageSelector: async (coverageSelector) => {
      try {
        const response = await fetch(apiUrlCoverageSelectors, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(coverageSelector),
        });
        const data = await response.json();
        const newCoverageSelector = toCoverageSelectorT(data);
        set((state) => ({
          coverageSelectors: [...state.coverageSelectors, newCoverageSelector],
        }));
        return newCoverageSelector;
      } catch (error) {
        throw Error(`Failed to add coverageSelector: ${error}`);
      }
    },

    updateCoverageSelector: async (updatedCoverageSelector) => {
      try {
        await fetch(
          `${apiUrlCoverageSelectors}/${updatedCoverageSelector.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedCoverageSelector),
          }
        );
        set((state) => ({
          coverageSelectors: state.coverageSelectors.map((c) =>
            c.id === updatedCoverageSelector.id ? updatedCoverageSelector : c
          ),
        }));
      } catch (error) {
        console.error("Failed to update coverageSelector:", error);
      }
    },

    deleteCoverageSelector: async (id) => {
      try {
        await fetch(`${apiUrlCoverageSelectors}/${id}`, {
          method: "DELETE",
        });
        set((state) => ({
          coverageSelectors: state.coverageSelectors.filter((c) => c.id !== id),
        }));
      } catch (error) {
        console.error("Failed to delete coverageSelector:", error);
      }
    },
  })
);
