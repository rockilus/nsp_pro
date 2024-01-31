// workerStore.ts
import { create } from "zustand";
import { WorkerT, WorkerPropertyT } from "../components/Worker/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlWorkers = baseApiUrl + "/workers";

type WorkerStateT = {
  workers: WorkerT[];
  fetchWorkers: () => void;
  addWorker: () => void;
  addPropertiesToStore: (newProperties: WorkerPropertyT[]) => void;
  updateWorker: (updatedWorker: WorkerT) => void;
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
      const response = await fetch(apiUrlWorkers, options); // Adjust API endpoint as needed
      const workers: WorkerT[] = await response.json();
      set({ workers });
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  },

  // Here I keep POST for the convention, but there is no body
  addWorker: async () => {
    try {
      const response = await fetch(apiUrlWorkers, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const newWorker: WorkerT = await response.json();
      set((state) => ({ workers: [...state.workers, newWorker] }));
    } catch (error) {
      console.error("Failed to add worker:", error);
    }
  },

  addPropertiesToStore: (newProperties) => {
    set((state) => ({
      workers: state.workers.map((worker) => {
        const newWorkerProperties = newProperties.filter(
          (property) => property.workerId === worker.id
        );

        return newWorkerProperties
          ? {
              ...worker,
              workerProperties: [
                ...worker.workerProperties,
                ...newWorkerProperties,
              ],
            }
          : worker;
      }),
    }));
  },

  updateWorker: async (updatedWorker) => {
    try {
      const response = await fetch(`${apiUrlWorkers}/${updatedWorker.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedWorker),
      });
      const newWorker: WorkerT = await response.json();
      set((state) => ({
        workers: state.workers.map((w) =>
          w.id === updatedWorker.id ? newWorker : w
        ),
      }));
    } catch (error) {
      console.error("Failed to update worker:", error);
    }
  },

  updateWorkerProperty: async (updatedWorkerProperty) => {
    try {
      const response = await fetch(
        `${apiUrlWorkers}/${updatedWorkerProperty.workerId}/properties/${updatedWorkerProperty.workerDimensionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedWorkerProperty.value),
        }
      );
      const newWorkerProperty: WorkerPropertyT = await response.json();
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
      await fetch(`${apiUrlWorkers}/${id}`, {
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
