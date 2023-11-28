import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { StatsOptionsT, StatsT } from "../components/Schedule/types";
import { useStatStore } from "./statStore";
import { emptyStatsOptions } from "../utils/emptyObjects";

dayjs.extend(utc);

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlStatsOptions = baseApiUrl + "/stats-options";

type StatsOptionsStateT = {
  statsOptions: StatsOptionsT | null;
  fetchStatsOptions: () => void;
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
    statsOptions: toStatsOptionsT(data.statsOptions),
    stats: data.stats,
  };
  return stats;
};

export const useStatsOptionsStore = create<StatsOptionsStateT>()((set) => ({
  statsOptions: null,

  fetchStatsOptions: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlStatsOptions, options);
      const data = await response.json();
      console.log("data", data);
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
      const response = await fetch(apiUrlStatsOptions, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(statsOptions),
      });
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
        `${apiUrlStatsOptions}/${updatedStatsOptions.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedStatsOptions),
        }
      );
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
