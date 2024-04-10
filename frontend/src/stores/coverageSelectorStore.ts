import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { CoverageSelectorT } from "../components/CoverageSelector/types";

const apiUrlCoverageSelectors =
  process.env.NEXT_PUBLIC_API_URL + "/coverage-selectors";

type CoverageSelectorStateT = {
  coverageSelectors: CoverageSelectorT[];
  fetchCoverageSelectors: (teamId: string) => void;
  fetchCoverageSelectorsStore: (coverageSelectors: CoverageSelectorT[]) => void;
  addCoverageSelector: (coverageSelector: CoverageSelectorT) => void;
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to fetch coverage selectors: " + responseData.detail,
              "error"
            );
          return;
        }
        const coverageSelectors = responseData.map(toCoverageSelectorT);
        set({ coverageSelectors });
      } catch (error) {
        console.error("Failed to fetch coverageSelectors:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch coverage selectors, please try again later",
            "error"
          );
      }
    },

    fetchCoverageSelectorsStore: (coverageSelectors) => {
      set({ coverageSelectors });
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to add coverage selector: " + responseData.detail,
              "error"
            );
          return;
        }
        const newCoverageSelector = toCoverageSelectorT(responseData);
        set((state) => ({
          coverageSelectors: [...state.coverageSelectors, newCoverageSelector],
        }));
      } catch (error) {
        console.error("Failed to add coverageSelector:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add coverage selector, please try again later",
            "error"
          );
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to update coverage selector: " + responseData.detail,
              "error"
            );
          return;
        }
        const newCoverageSelector = toCoverageSelectorT(responseData);
        set((state) => ({
          coverageSelectors: state.coverageSelectors.map((c) =>
            c.id === newCoverageSelector.id ? newCoverageSelector : c
          ),
        }));
      } catch (error) {
        console.error("Failed to update coverageSelector:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update update selector, please try again later",
            "error"
          );
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to delete coverage selector: " + responseData.detail,
              "error"
            );
          return;
        }
        set((state) => ({
          coverageSelectors: state.coverageSelectors.filter(
            (c) => c.id !== coverageSelectorId
          ),
        }));
      } catch (error) {
        console.error("Failed to delete coverageSelector:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete coverage selector, please try again later",
            "error"
          );
      }
    },
  })
);
