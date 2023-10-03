// workerStore.ts
import { create } from "zustand";
import { WorkerT, WorkerPropertyT } from "../components/Worker/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlSolver = baseApiUrl + "/solver";

type SolverStateT = {
  solver: SolverT;
  fetchSolver: () => void;
};

export const useSolverStore = create<SolverStateT>()((set) => ({
  solver: undefined,

  fetchSolver: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlSolver, options);
      const solver: SolverT = await response.json();
      set({ solver });
    } catch (error) {
      console.error("Failed to fetch solver:", error);
    }
  },
}));
