import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { ObjectiveBreachT, VariableT } from "../components/Schedule/types";

dayjs.extend(utc);

const apiUrlObjectiveBreach = process.env.NEXT_PUBLIC_API_URL + "/breaches";

type ObjectiveBreachStateT = {
  objectiveBreaches: ObjectiveBreachT[];
  fetchObjectiveBreaches: (teamId: string) => void;
  fetchObjectiveBreachesStore: (objectiveBreaches: ObjectiveBreachT[]) => void;
  addObjectiveBreach: (
    objectiveBreach: ObjectiveBreachT,
    teamId: string
  ) => void;
  updateObjectiveBreachStore: (
    updatedObjectiveBreaches: ObjectiveBreachT[]
  ) => void;
  updateObjectiveBreach: (
    updatedObjectiveBreach: ObjectiveBreachT,
    teamId: string
  ) => void;
  deleteObjectiveBreach: (objectBreachId: string, teamId: string) => void;
  deleteOBStoreWithScheduleId: (scheduleId: string) => void;
};

export const toObjectiveBreachT = (data: any) => {
  const constraintBreach: ObjectiveBreachT = {
    ...data,
    variables: data.variables.map((variable: any) => {
      const variableT: VariableT = {
        ...variable,
        date: dayjs.utc(variable.date),
      };
      return variableT;
    }),
  };
  return constraintBreach;
};

export const useObjectiveBreachStore = create<ObjectiveBreachStateT>()(
  (set) => ({
    objectiveBreaches: [],

    fetchObjectiveBreaches: async (teamId) => {
      const options: RequestInit = {
        method: "GET",
        credentials: "include" as RequestCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      };
      try {
        const response = await fetch(
          `${apiUrlObjectiveBreach}/teams/${teamId}`,
          options
        );
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to fetch objective breaches: " + responseData.detail,
              "error"
            );
          return;
        }
        const objectiveBreaches: ObjectiveBreachT[] =
          responseData.map(toObjectiveBreachT);
        set({ objectiveBreaches });
      } catch (error) {
        console.error("Failed to fetch objectiveBreach:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch objective breaches, please try again later",
            "error"
          );
      }
    },

    fetchObjectiveBreachesStore: (objectiveBreaches) => {
      set({
        objectiveBreaches: objectiveBreaches.map(toObjectiveBreachT),
      });
    },

    addObjectiveBreach: async (objectiveBreach, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlObjectiveBreach}/teams/${teamId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(objectiveBreach),
          }
        );
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to add objective breach: " + responseData.detail,
              "error"
            );
          return;
        }
        const newObjectiveBreach: ObjectiveBreachT =
          toObjectiveBreachT(responseData);
        set((state) => ({
          objectiveBreaches: [...state.objectiveBreaches, newObjectiveBreach],
        }));
      } catch (error) {
        console.error("Failed to add objectiveBreach:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add objective breach, please try again later",
            "error"
          );
      }
    },

    updateObjectiveBreachStore: (updatedObjectiveBreaches) => {
      set((state) => ({
        objectiveBreaches: updatedObjectiveBreaches,
      }));
    },

    updateObjectiveBreach: async (updatedObjectiveBreach, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlObjectiveBreach}/${updatedObjectiveBreach.id}/teams/${teamId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedObjectiveBreach),
          }
        );
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to update objective breach: " + responseData.detail,
              "error"
            );
          return;
        }
        const newObjectiveBreach: ObjectiveBreachT =
          toObjectiveBreachT(responseData);
        set((state) => ({
          objectiveBreaches: state.objectiveBreaches.map((s) =>
            s.id === newObjectiveBreach.id ? newObjectiveBreach : s
          ),
        }));
      } catch (error) {
        console.error("Failed to update objectiveBreach:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update objective breach, please try again later",
            "error"
          );
      }
    },

    deleteObjectiveBreach: async (objectBreachId, teamId) => {
      try {
        const response = await fetch(
          `${apiUrlObjectiveBreach}/${objectBreachId}/teams/${teamId}`,
          {
            method: "DELETE",
          }
        );
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to delete objective breach: " + responseData.detail,
              "error"
            );
          return;
        }
        set((state) => ({
          objectiveBreaches: state.objectiveBreaches.filter(
            (s) => s.id !== objectBreachId
          ),
        }));
      } catch (error) {
        console.error("Failed to delete objectiveBreach:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete objective breach, please try again later",
            "error"
          );
      }
    },

    deleteOBStoreWithScheduleId: (scheduleId) => {
      set((state) => ({
        objectiveBreaches: state.objectiveBreaches.filter(
          (ob) => ob.scheduleId !== scheduleId
        ),
      }));
    },
  })
);
