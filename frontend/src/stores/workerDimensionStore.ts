// workerDimensionStore.ts
import { create } from "zustand";
import { WorkerDimensionT } from "../components/Worker/types";

const baseApiUrl = "http://127.0.0.1:5000";

// WorkerDimension
// const apiUrlWorkerDimensions = `${baseApiUrl}/worker-dimensions`;

// WITH OLD API
// Worker Dimension
const createWorkerDimensionUrl = baseApiUrl + "/worker-dimensions";
const getWorkerDimensionsUrl = baseApiUrl + "/worker-dimensions";
const updateWorkerDimensionUrl = (workerDimensionId: string) => `${baseApiUrl}/worker-dimensions/${workerDimensionId}`;
const deleteWorkerDimensionUrl = (workerDimensionId: string) => `${baseApiUrl}/worker-dimensions/${workerDimensionId}`;

type WorkerDimensionStateT = {
  workerDimensions: WorkerDimensionT[];
  fetchWorkerDimensions: () => void;
  addWorkerDimension: (WorkerDimension: WorkerDimensionT) => void;
  updateWorkerDimension: (updatedWorkerDimension: WorkerDimensionT) => void;
  deleteWorkerDimension: (id: string) => void;
};

export const useWorkerDimensionStore = create<WorkerDimensionStateT>()(
  (set) => ({
    workerDimensions: [],

    fetchWorkerDimensions: async () => {
      const options: RequestInit = {
        method: "GET",
        credentials: "include" as RequestCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      };
      try {
        const response = await fetch(getWorkerDimensionsUrl, options); // Adjust API endpoint as needed
        const data = await response.json();
        const workerDimensions = data; //check if this works
        set({ workerDimensions });
      } catch (error) {
        console.error("Failed to fetch workerDimensions:", error);
      }
    },

    // Here I keep POST for the convention, but there is no body
    addWorkerDimension: async (workerDimension) => {
      try {
        const response = await fetch(createWorkerDimensionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(workerDimension),
        });
        const data = await response.json();
        const newWorkerDimension: WorkerDimensionT = data; // check if this works
        set((state) => ({
          workerDimensions: [...state.workerDimensions, newWorkerDimension],
        }));
      } catch (error) {
        console.error("Failed to add workerDimension:", error);
      }
    },

    updateWorkerDimension: async (updatedWorkerDimension) => {
      try {
        const response = await fetch(updateWorkerDimensionUrl(updatedWorkerDimension.id), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedWorkerDimension),
        });
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

    deleteWorkerDimension: async (id) => {
      try {
        await fetch(deleteWorkerDimensionUrl(id), {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });
        set((state) => ({
          workerDimensions: state.workerDimensions.filter((c) => c.id !== id),
        }));
      } catch (error) {
        console.error("Failed to delete workerDimension:", error);
      }
    },
  })
);
