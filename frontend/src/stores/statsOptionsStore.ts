import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useStatStore } from "./statStore";
import { useSnackBarStore } from "./snackbarStore";
// Types
import { StatsOptionsT, StatsT } from "../components/Schedule/types";

dayjs.extend(utc);

const apiUrlStatsOptions = process.env.NEXT_PUBLIC_API_URL + "/stats-options";

type StatsOptionsStateT = {
  statsOptions: StatsOptionsT | null;
  fetchStatsOptions: (teamId: string) => void;
  addStatsOptions: (statsOptions: StatsOptionsT) => void;
  updateStatsOptions: (updatedStatsOptions: StatsOptionsT) => void;
};

const toStatsOptionsT = (data: any) => {
  const statsOptions: StatsOptionsT = {
    ...data,
    startDate: dayjs.utc(data.startDate),
    endDate: dayjs.utc(data.endDate),
  };
  return statsOptions;
};

const toStatsT = (data: any) => {
  const stats: StatsT = {
    statsOptions: data.statsOptions ? toStatsOptionsT(data.statsOptions) : null,
    stats: data.stats,
  };
  return stats;
};

export const useStatsOptionsStore = create<StatsOptionsStateT>()((set) => ({
  statsOptions: null,

  fetchStatsOptions: async (teamId) => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(
        `${apiUrlStatsOptions}/teams/${teamId}`,
        options
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch stats options: " + responseData.detail,
            "error"
          );
        return;
      }
      const newStats: StatsT = toStatsT(responseData);
      set((state) => ({
        statsOptions: newStats.statsOptions,
      }));
      useStatStore.setState({ stats: newStats.stats });
    } catch (error) {
      console.error("Failed to fetch statsOptions:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch stats options, please try again later",
          "error"
        );
    }
  },

  addStatsOptions: async (statsOptions) => {
    try {
      const response = await fetch(
        `${apiUrlStatsOptions}/teams/${statsOptions.teamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(statsOptions),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add stats options: " + responseData.detail,
            "error"
          );
        return;
      }
      const newStats: StatsT = toStatsT(responseData);
      set((state) => ({
        statsOptions: newStats.statsOptions,
      }));
      useStatStore.setState({ stats: newStats.stats });
    } catch (error) {
      console.error("Failed to add statsOptions:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add stats options, please try again later",
          "error"
        );
    }
  },

  updateStatsOptions: async (updatedStatsOptions) => {
    try {
      const response = await fetch(
        `${apiUrlStatsOptions}/${updatedStatsOptions.id}/teams/${updatedStatsOptions.teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedStatsOptions),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update stats options: " + responseData.detail,
            "error"
          );
        return;
      }
      const newStats: StatsT = toStatsT(responseData);
      set((state) => ({
        statsOptions: newStats.statsOptions,
      }));
      useStatStore.setState({ stats: newStats.stats });
    } catch (error) {
      console.error("Failed to update statsOptions:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update stats options, please try again later",
          "error"
        );
    }
  },
}));
