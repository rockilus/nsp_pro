import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { CoverageSelectorT } from "../components/ScheduleOptions/types";

dayjs.extend(utc);

const apiUrlCoverageSelectors =
  process.env.NEXT_PUBLIC_API_URL + "/coverage-selectors";

type CoverageSelectorStateT = {
  coverageSelectors: CoverageSelectorT[];
  fetchCoverageSelectors: (scheduleId: string, teamId: string) => void;
  fetchCoverageSelectorsStore: (coverageSelectors: CoverageSelectorT[]) => void;
  addCoverageSelector: (
    coverageSelector: CoverageSelectorT,
    teamId: string
  ) => void;
  updateCoverageSelector: (
    updatedCoverageSelector: CoverageSelectorT,
    teamId: string
  ) => void;
  deleteCoverageSelector: (coverageSelectorId: string, teamId: string) => void;
};

const toCoverageSelectorT = (data: any) => {
  const covSel: CoverageSelectorT = {
    ...data,
    startDate: dayjs.utc(data.startDate),
    endDate: dayjs.utc(data.endDate),
  };
  return covSel;
};

export const useCoverageSelectorStore = create<CoverageSelectorStateT>()(
  (set) => ({
    coverageSelectors: [],

    fetchCoverageSelectors: async (scheduleId, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlCoverageSelectors}/schedules/${scheduleId}/teams/${teamId}`
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
      set({ coverageSelectors: coverageSelectors.map(toCoverageSelectorT) });
    },

    addCoverageSelector: async (coverageSelector, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlCoverageSelectors}/teams/${teamId}`,
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

    updateCoverageSelector: async (updatedCoverageSelector, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlCoverageSelectors}/${updatedCoverageSelector.id}/teams/${teamId}`,
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
