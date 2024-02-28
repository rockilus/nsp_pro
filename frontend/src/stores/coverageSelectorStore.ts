// coverageSelectorStore.ts
import { create } from "zustand";
import { CoverageSelectorT } from "../components/CoverageSelector/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlCoverageSelectors = `${baseApiUrl}/coverage-selectors`;

type CoverageSelectorStateT = {
  coverageSelectors: CoverageSelectorT[];
  fetchCoverageSelectors: (teamId: string) => void;
  addCoverageSelector: (
    coverageSelector: CoverageSelectorT
  ) => Promise<CoverageSelectorT>;
  updateCoverageSelector: (updatedCoverageSelector: CoverageSelectorT) => void;
  deleteCoverageSelector: (coverageSelectorId: string, teamId: string) => void;
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

    fetchCoverageSelectors: async (teamId) => {
      try {
        const response = await fetch(
          `${apiUrlCoverageSelectors}/teams/${teamId}`
        );
        if (!response.ok) {
          throw Error(
            `Failed to fetch coverageSelectors: ${response.statusText}`
          );
        }
        const data = await response.json();
        const coverageSelectors = data.map(toCoverageSelectorT);
        set({ coverageSelectors });
      } catch (error) {
        console.error("Failed to fetch coverageSelectors:", error);
      }
    },

    addCoverageSelector: async (coverageSelector) => {
      try {
        const response = await fetch(
          `${apiUrlCoverageSelectors}/teams/${coverageSelector.teamId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(coverageSelector),
          }
        );
        if (!response.ok) {
          throw Error(`Failed to add coverageSelector: ${response.statusText}`);
        }
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
        const response = await fetch(
          `${apiUrlCoverageSelectors}/${updatedCoverageSelector.id}/teams/${updatedCoverageSelector.teamId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedCoverageSelector),
          }
        );
        if (!response.ok) {
          throw Error(
            `Failed to update coverageSelector: ${response.statusText}`
          );
        }
        const data = await response.json();
        const newCoverageSelector = toCoverageSelectorT(data);
        set((state) => ({
          coverageSelectors: state.coverageSelectors.map((c) =>
            c.id === newCoverageSelector.id ? newCoverageSelector : c
          ),
        }));
      } catch (error) {
        console.error("Failed to update coverageSelector:", error);
      }
    },

    deleteCoverageSelector: async (coverageSelectorId, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlCoverageSelectors}/${coverageSelectorId}/teams/${teamId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) {
          throw Error(
            `Failed to delete coverageSelector: ${response.statusText}`
          );
        }
        set((state) => ({
          coverageSelectors: state.coverageSelectors.filter(
            (c) => c.id !== coverageSelectorId
          ),
        }));
      } catch (error) {
        console.error("Failed to delete coverageSelector:", error);
      }
    },
  })
);
