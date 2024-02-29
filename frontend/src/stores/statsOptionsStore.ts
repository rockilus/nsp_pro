import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useStatStore } from "./statStore";
// Types
import { StatsOptionsT, StatsT } from "../components/Schedule/types";
// Constants
import { ApiUrl } from "../utils/env_config";

dayjs.extend(utc);

const apiUrlStatsOptions = ApiUrl + "/stats-options";

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
      if (!response.ok) {
        throw new Error(`Failed to fetch statsOptions: ${response.statusText}`);
      }
      const data = await response.json();
      const newStats: StatsT = toStatsT(data);
      set((state) => ({
        statsOptions: newStats.statsOptions,
      }));
      useStatStore.setState({ stats: newStats.stats });
    } catch (error) {
      console.error("Failed to fetch statsOptions:", error);
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
      if (!response.ok) {
        throw new Error(`Failed to add statsOptions: ${response.statusText}`);
      }
      const data = await response.json();
      const newStats: StatsT = toStatsT(data);
      set((state) => ({
        statsOptions: newStats.statsOptions,
      }));
      useStatStore.setState({ stats: newStats.stats });
    } catch (error) {
      throw Error(`Failed to add statsOptions: ${error}`);
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
      if (!response.ok) {
        throw new Error(
          `Failed to update statsOptions: ${response.statusText}`
        );
      }
      const data = await response.json();
      const newStats: StatsT = toStatsT(data);
      set((state) => ({
        statsOptions: newStats.statsOptions,
      }));
      useStatStore.setState({ stats: newStats.stats });
    } catch (error) {
      console.error("Failed to update statsOptions:", error);
    }
  },
}));
