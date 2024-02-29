import { create } from "zustand";
// Types
import { WorkerT, WorkerPropertyT } from "../components/Worker/types";
// Constants
import { ApiUrl } from "../utils/env_config";

const apiUrlWorkers = ApiUrl + "/workers";

type WorkerStateT = {
  workers: WorkerT[];
  fetchWorkers: (teamId: string) => void;
  addWorker: (worker: WorkerT) => void;
  addPropertiesToStore: (newProperties: WorkerPropertyT[]) => void;
  updateWorker: (updatedWorker: WorkerT) => void;
  updateWorkerProperty: (
    teamId: string,
    updatedWorkerProperty: WorkerPropertyT
  ) => void;
  deleteWorker: (workerId: string, teamId: string) => void;
};

export const useWorkerStore = create<WorkerStateT>()((set) => ({
  workers: [],

  fetchWorkers: async (teamId) => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(`${apiUrlWorkers}/teams/${teamId}`, options);
      if (!response.ok) {
        console.log("Failed to fetch workers", response);
        throw new Error("Failed to fetch workers");
      }
      const workers: WorkerT[] = await response.json();
      set({ workers });
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  },

  addWorker: async (worker: WorkerT) => {
    try {
      const response = await fetch(`${apiUrlWorkers}/teams/${worker.teamId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(worker),
      });
      if (!response.ok) {
        console.log("Failed to add worker", response);
        throw new Error("Failed to add worker");
      }
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
      const response = await fetch(
        `${apiUrlWorkers}/${updatedWorker.id}/teams/${updatedWorker.teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedWorker),
        }
      );
      if (!response.ok) {
        console.log("Failed to update worker", response);
        throw new Error("Failed to update worker");
      }
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

  updateWorkerProperty: async (teamId, updatedWorkerProperty) => {
    try {
      const response = await fetch(
        `${apiUrlWorkers}/${updatedWorkerProperty.workerId}/properties/${updatedWorkerProperty.workerDimensionId}/teams/${teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedWorkerProperty),
        }
      );
      if (!response.ok) {
        console.log("Failed to update workerProperty", response);
        throw new Error("Failed to update workerProperty");
      }
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

  deleteWorker: async (workerId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlWorkers}/${workerId}/teams/${teamId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workerId, teamId }),
        }
      );
      if (!response.ok) {
        console.log("Failed to delete worker", response);
        throw new Error("Failed to delete worker");
      }
      set((state) => ({
        workers: state.workers.filter((c) => c.id !== workerId),
      }));
    } catch (error) {
      console.error("Failed to delete worker:", error);
    }
  },
}));
