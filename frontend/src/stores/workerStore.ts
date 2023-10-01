// workerStore.ts
import { create } from "zustand";
import { WorkerT, WorkerPropertyT } from "../components/Worker/types";

const baseApiUrl = "http://127.0.0.1:5000";

// Worker
// const apiUrlWorkers = `${baseApiUrl}/workers`;

// WITH OLD API
// Worker
const createWorkerUrl = baseApiUrl + "/workers";
const getWorkersUrl = baseApiUrl + "/workers";
const deleteWorkerUrl = (workerId: string) => `${baseApiUrl}/workers/${workerId}`;

// Worker Property
const updateWorkerPropertyUrl = (workerId: string, workerDimensionId: string) => `${baseApiUrl}/workers/${workerId}/properties/${workerDimensionId}`;

type WorkerStateT = {
  workers: WorkerT[];
  fetchWorkers: () => void;
  addWorker: () => void;
  updateWorkerProperty: (updatedWorkerProperty: WorkerPropertyT) => void;
  deleteWorker: (id: string) => void;
};

export const useWorkerStore = create<WorkerStateT>()((set) => ({
  workers: [],

  fetchWorkers: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(getWorkersUrl, options); // Adjust API endpoint as needed
      const data = await response.json();
      const workers = data; //check if this works
      set({ workers });
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  },

  // Here I keep POST for the convention, but there is no body
  addWorker: async () => {
    try {
      const response = await fetch(createWorkerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      const newWorker: WorkerT = data; // check if this works
      set((state) => ({ workers: [...state.workers, newWorker] }));
    } catch (error) {
      console.error("Failed to add worker:", error);
    }
  },

  updateWorkerProperty: async (updatedWorkerProperty) => {
    try {
      const response = await fetch(updateWorkerPropertyUrl(updatedWorkerProperty.workerId, updatedWorkerProperty.workerDimensionId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedWorkerProperty.value),
      });
      const data = await response.json();
      const newWorkerProperty: WorkerPropertyT = data; // check if this works
      set((state) => ({
        workers: state.workers.map((worker) =>
          worker.id === newWorkerProperty.workerId
            ? {
                ...worker,
                workerProperties: worker.workerProperties.some(
                  (workerProperty) => workerProperty.id === newWorkerProperty.id
                )
                  ? worker.workerProperties.map((workerProperty) =>
                      workerProperty.id === newWorkerProperty.id
                        ? newWorkerProperty
                        : workerProperty
                    )
                  : [...worker.workerProperties, newWorkerProperty],
              }
            : worker
        ),
      }));
    } catch (error) {
      console.error("Failed to update worker:", error);
    }
  },

  deleteWorker: async (id) => {
    try {
      await fetch(deleteWorkerUrl(id), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      set((state) => ({
        workers: state.workers.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete worker:", error);
    }
  },
}));
