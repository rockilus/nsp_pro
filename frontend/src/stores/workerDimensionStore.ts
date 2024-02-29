import { create } from "zustand";
// Stores
import { useWorkerStore } from "./workerStore";
// Types
import {
  WorkerDimensionT,
  NewWorkerDimensionT,
} from "../components/Worker/types";
// Constants
import { ApiUrl } from "../utils/env_config";

const apiUrlWorkerDimensions = ApiUrl + "/worker-dimensions";

type WorkerDimensionStateT = {
  workerDimensions: WorkerDimensionT[];
  fetchWorkerDimensions: (teamId: string) => void;
  addWorkerDimension: (WorkerDimension: WorkerDimensionT) => void;
  updateWorkerDimension: (updatedWorkerDimension: WorkerDimensionT) => void;
  deleteWorkerDimension: (workerDimensionId: string, teamId: string) => void;
};

export const useWorkerDimensionStore = create<WorkerDimensionStateT>()(
  (set) => ({
    workerDimensions: [],

    fetchWorkerDimensions: async (teamId) => {
      const options: RequestInit = {
        method: "GET",
        credentials: "include" as RequestCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      };
      try {
        const response = await fetch(
          `${apiUrlWorkerDimensions}/teams/${teamId}`,
          options
        );
        if (!response.ok) {
          console.log("Failed to fetch workerDimensions", response);
          throw new Error("Failed to fetch workerDimensions");
        }
        const data = await response.json();
        const workerDimensions = data;
        set({ workerDimensions });
      } catch (error) {
        console.error("Failed to fetch workerDimensions:", error);
      }
    },

    // Here I keep POST for the convention, but there is no body
    addWorkerDimension: async (workerDimension) => {
      try {
        const response = await fetch(
          `${apiUrlWorkerDimensions}/teams/${workerDimension.teamId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(workerDimension),
          }
        );
        if (!response.ok) {
          console.log("Failed to add workerDimension", response);
          throw new Error("Failed to add workerDimension");
        }
        const data = await response.json();
        const newWorkerDimension: NewWorkerDimensionT = data;
        set((state) => ({
          workerDimensions: [
            ...state.workerDimensions,
            newWorkerDimension.newDimension,
          ],
        }));
        useWorkerStore
          .getState()
          .addPropertiesToStore(newWorkerDimension.newProperties);
      } catch (error) {
        console.error("Failed to add workerDimension:", error);
      }
    },

    updateWorkerDimension: async (updatedWorkerDimension) => {
      try {
        const response = await fetch(
          `${apiUrlWorkerDimensions}/${updatedWorkerDimension.id}/teams/${updatedWorkerDimension.teamId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedWorkerDimension),
          }
        );
        if (!response.ok) {
          console.log("Failed to update workerDimension", response);
          throw new Error("Failed to update workerDimension");
        }
        const data = await response.json();
        const newWorkerDimension: WorkerDimensionT = data; // check if this works
        set((state) => ({
          workerDimensions: state.workerDimensions.map((workerDimension) =>
            workerDimension.id === newWorkerDimension.id
              ? newWorkerDimension
              : workerDimension
          ),
        }));
      } catch (error) {
        console.error("Failed to update workerDimension:", error);
      }
    },

    deleteWorkerDimension: async (workerDimensionId, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlWorkerDimensions}/${workerDimensionId}/teams/${teamId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ workerDimensionId, teamId }),
          }
        );
        if (!response.ok) {
          console.log("Failed to delete workerDimension", response);
          throw new Error("Failed to delete workerDimension");
        }
        set((state) => ({
          workerDimensions: state.workerDimensions.filter(
            (c) => c.id !== workerDimensionId
          ),
        }));
      } catch (error) {
        console.error("Failed to delete workerDimension:", error);
      }
    },
  })
);
