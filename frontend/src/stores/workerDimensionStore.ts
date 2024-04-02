import { create } from "zustand";
// Stores
import { useWorkerStore } from "./workerStore";
import { useSnackBarStore } from "./snackbarStore";
// Types
import {
  WorkerDimensionT,
  NewWorkerDimensionT,
} from "../components/Worker/types";

const apiUrlWorkerDimensions =
  process.env.NEXT_PUBLIC_API_URL + "/worker-dimensions";

type WorkerDimensionStateT = {
  workerDimensions: WorkerDimensionT[];
  fetchWorkerDimensions: (teamId: string) => void;
  addWorkerDimension: (WorkerDimension: WorkerDimensionT) => Promise<boolean>;
  updateWorkerDimension: (
    updatedWorkerDimension: WorkerDimensionT
  ) => Promise<boolean>;
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to fetch worker dimensions: " + responseData.detail,
              "error"
            );
          return;
        }
        const workerDimensions: WorkerDimensionT[] = responseData;
        set({ workerDimensions });
      } catch (error) {
        console.error("Failed to fetch worker dimensions:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch worker dimensions, please try again later",
            "error"
          );
      }
    },

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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to add worker dimension: " + responseData.detail,
              "error"
            );
          return false;
        }
        const newWorkerDimension: NewWorkerDimensionT = responseData;
        set((state) => ({
          workerDimensions: [
            ...state.workerDimensions,
            newWorkerDimension.newDimension,
          ],
        }));
        useWorkerStore
          .getState()
          .addPropertiesToStore(newWorkerDimension.newProperties);
        return true;
      } catch (error) {
        console.error("Failed to add worker dimension:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add worker dimension, please try again later",
            "error"
          );
        return false;
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to update worker dimension: " + responseData.detail,
              "error"
            );
          return false;
        }
        const newWorkerDimension: WorkerDimensionT = responseData;
        set((state) => ({
          workerDimensions: state.workerDimensions.map((workerDimension) =>
            workerDimension.id === newWorkerDimension.id
              ? newWorkerDimension
              : workerDimension
          ),
        }));
        return true;
      } catch (error) {
        console.error("Failed to update worker dimension:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update worker dimension, please try again later",
            "error"
          );
        return false;
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
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to delete worker dimension: " + responseData.detail,
              "error"
            );
          return;
        }
        set((state) => ({
          workerDimensions: state.workerDimensions.filter(
            (c) => c.id !== workerDimensionId
          ),
        }));
      } catch (error) {
        console.error("Failed to delete worker dimension:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete worker dimension, please try again later",
            "error"
          );
      }
    },
  })
);
