import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { StatT } from "../components/Schedule/types";

dayjs.extend(utc);

const apiUrlStat = process.env.NEXT_PUBLIC_API_URL + "/stats";

type StatStateT = {
  stats: StatT[];
  fetchStats: () => void;
  addStat: (stat: StatT) => void;
  updateStatStore: (updatedStats: StatT[]) => void;
  deleteSStore: () => void;
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
      const stats: StatT[] = responseData.map(toStatT);
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

  addStat: async (stat) => {
    try {
      const response = await fetch(apiUrlStat, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stat),
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add stat: " + responseData.detail,
            "error"
          );
        return;
      }
      const newStat: StatT = toStatT(responseData);
      set((state) => ({
        stats: [...state.stats, newStat],
      }));
    } catch (error) {
      console.error("Failed to add stat:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar("Failed to add stat, please try again later", "error");
    }
  },

  updateStatStore: (updatedStats) => {
    set((state) => ({
      stats: updatedStats,
    }));
  },

  deleteSStore: () => {
    set((state) => ({
      stats: [],
    }));
  },
}));
