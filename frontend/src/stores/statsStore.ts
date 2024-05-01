import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import {
  StatsT,
  StatsHeaderT,
  GetStatsOptionsT,
} from "../components/Stats/types";
import { TemplateOptionValueT } from "../components/Constraint/types";
dayjs.extend(utc);

const apiUrlStat = process.env.NEXT_PUBLIC_API_URL + "/stats";

type StatsStateT = {
  stats: StatsT | null;
  shiftOptions: Record<string, TemplateOptionValueT[]>;
  fetchStats: (getStatOptions: GetStatsOptionsT, teamId: string) => void;
  fetchShiftOptions: (teamId: string) => void;
  addHeaderToCustom: (header: StatsHeaderT) => void;
  updateHeaderInCustom: (header: StatsHeaderT) => void;
  deleteHeaderFromCustom: (headerId: string, teamId: string) => void;
};

export const useStatStore = create<StatsStateT>()((set) => ({
  stats: null,
  shiftOptions: {},

  fetchStats: async (getStatsOptions, teamId) => {
    const options: RequestInit = {
      method: "POST",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getStatsOptions),
    };
    try {
      const response = await fetch(`${apiUrlStat}/teams/${teamId}`, options);
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch stats: " + responseData.detail,
            "error"
          );
        return;
      }
      const stats: StatsT = responseData;
      set({ stats });
    } catch (error) {
      console.error("Failed to fetch stat:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch stats, please try again later",
          "error"
        );
    }
  },

  fetchShiftOptions: async (teamId) => {
    try {
      const response = await fetch(
        `${apiUrlStat}/shift-options/teams/${teamId}`
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch shift options: " + responseData.detail,
            "error"
          );
        return;
      }
      const shiftOptions: Record<string, TemplateOptionValueT[]> = responseData;
      set({ shiftOptions });
    } catch (error) {
      console.error("Failed to fetch shift options:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch shift options, please try again later",
          "error"
        );
    }
  },

  addHeaderToCustom: async (header) => {
    try {
      const response = await fetch(
        `${apiUrlStat}/stats-headers/teams/${header.teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(header),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add header to custom: " + responseData.detail,
            "error"
          );
        return;
      }
      const newHeader: StatsHeaderT = responseData;
      set((state) => ({
        stats: {
          statsHeaders:
            state.stats?.statsHeaders.map((h) =>
              h.id === header.id ? newHeader : h
            ) || [],
          statsValues:
            state.stats?.statsValues.map((v) =>
              v.headerId === header.id ? { ...v, headerId: newHeader.id } : v
            ) || [],
        },
      }));
    } catch (error) {
      console.error("Failed to add header to custom:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add header to custom, please try again later",
          "error"
        );
    }
  },

  updateHeaderInCustom: async (header) => {
    try {
      const response = await fetch(`${apiUrlStat}/stats-headers/${header.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(header),
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update header in custom: " + responseData.detail,
            "error"
          );
        return;
      }
      const updatedHeader: StatsHeaderT = responseData;
      set((state) => ({
        stats: {
          statsHeaders:
            state.stats?.statsHeaders.map((h) =>
              h.id === header.id ? updatedHeader : h
            ) || [],
          statsValues: state.stats?.statsValues || [],
        },
      }));
    } catch (error) {
      console.error("Failed to update header in custom:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update header in custom, please try again later",
          "error"
        );
    }
  },

  deleteHeaderFromCustom: async (headerId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlStat}/stats-headers/${headerId}/teams/${teamId}`,
        {
          method: "DELETE",
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete header from custom: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        stats: {
          statsHeaders:
            state.stats?.statsHeaders.map((h) =>
              h.id === headerId ? { ...h, inCustom: false } : h
            ) || [],
          statsValues: state.stats?.statsValues || [],
        },
      }));
    } catch (error) {
      console.error("Failed to delete header from custom:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete header from custom, please try again later",
          "error"
        );
    }
  },
}));
