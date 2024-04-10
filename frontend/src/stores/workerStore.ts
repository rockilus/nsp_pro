import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { WorkerT, WorkerPropertyT } from "../components/Worker/types";

const apiUrlWorkers = process.env.NEXT_PUBLIC_API_URL + "/workers";

type WorkerStateT = {
  workers: WorkerT[];
  fetchWorkers: (teamId: string) => void;
  fetchWorkersStore: (workers: WorkerT[]) => void;
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch workers: " + responseData.detail,
            "error"
          );
        return;
      }
      const workers: WorkerT[] = responseData;
      set({ workers });
    } catch (error) {
      console.error("Failed to fetch workers:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch workers, please try again later",
          "error"
        );
    }
  },

  fetchWorkersStore: (workers) => {
    set({ workers });
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add worker: " + responseData.detail,
            "error"
          );
        return;
      }
      const newWorker: WorkerT = responseData;
      set((state) => ({ workers: [...state.workers, newWorker] }));
    } catch (error) {
      console.error("Failed to add worker:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add worker, please try again later",
          "error"
        );
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update worker: " + responseData.detail,
            "error"
          );
        return;
      }
      const newWorker: WorkerT = responseData;
      set((state) => ({
        workers: state.workers.map((w) =>
          w.id === updatedWorker.id ? newWorker : w
        ),
      }));
      return {
        statusOK: true,
        message: "Worker updated",
      };
    } catch (error) {
      console.error("Failed to update worker:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update worker, please try again later",
          "error"
        );
      return;
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update worker: " + responseData.detail,
            "error"
          );
        return;
      }
      const newWorkerProperty: WorkerPropertyT = responseData;
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
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update worker, please try again later",
          "error"
        );
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
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete worker: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        workers: state.workers.filter((c) => c.id !== workerId),
      }));
    } catch (error) {
      console.error("Failed to delete worker:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete worker, please try again later",
          "error"
        );
    }
  },
}));
