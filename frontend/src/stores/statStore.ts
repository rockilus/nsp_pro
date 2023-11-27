import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { StatT } from "../components/Schedule/types";

dayjs.extend(utc);

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlStat = baseApiUrl + "/stats";

type StatStateT = {
  stats: StatT[];
  fetchStats: () => void;
  addStat: (stat: StatT) => void;
  updateStatStore: (updatedStats: StatT[]) => void;
};

export const toStatT = (data: any) => {
  const stat: StatT = {
    ...data,
    date: dayjs.utc(data.date),
  };
  return stat;
};

export const useStatStore = create<StatStateT>()((set) => ({
  stats: [],

  fetchStats: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlStat, options);
      const data = await response.json();
      console.log("data", data);

      const stats: StatT[] = data.map(toStatT);
      set({ stats });
    } catch (error) {
      console.error("Failed to fetch stat:", error);
    }
  },

  addStat: async (stat) => {
    try {
      const response = await fetch(apiUrlStat, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stat),
      });
      const data = await response.json();
      const newStat: StatT = toStatT(data);
      set((state) => ({
        stats: [...state.stats, newStat],
      }));
    } catch (error) {
      throw Error(`Failed to add stat: ${error}`);
    }
  },

  updateStatStore: (updatedStats) => {
    set((state) => ({
      stats: updatedStats,
    }));
  },
}));
