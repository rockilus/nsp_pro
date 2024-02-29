import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Constants
import { ApiUrl } from "../utils/env_config";

import { ObjectiveBreachT, VariableT } from "../components/Schedule/types";

dayjs.extend(utc);

const apiUrlObjectiveBreach = ApiUrl + "/objective_breaches";

type ObjectiveBreachStateT = {
  objectiveBreaches: ObjectiveBreachT[];
  fetchObjectiveBreaches: (teamId: string) => void;
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const objectiveBreaches: ObjectiveBreachT[] =
          data.map(toObjectiveBreachT);
        set({ objectiveBreaches });
      } catch (error) {
        console.error("Failed to fetch objectiveBreach:", error);
      }
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const newObjectiveBreach: ObjectiveBreachT = toObjectiveBreachT(data);
        set((state) => ({
          objectiveBreaches: [...state.objectiveBreaches, newObjectiveBreach],
        }));
      } catch (error) {
        throw Error(`Failed to add objectiveBreach: ${error}`);
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const newObjectiveBreach: ObjectiveBreachT = toObjectiveBreachT(data);
        set((state) => ({
          objectiveBreaches: state.objectiveBreaches.map((s) =>
            s.id === newObjectiveBreach.id ? newObjectiveBreach : s
          ),
        }));
      } catch (error) {
        console.error("Failed to update objectiveBreach:", error);
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        set((state) => ({
          objectiveBreaches: state.objectiveBreaches.filter(
            (s) => s.id !== objectBreachId
          ),
        }));
      } catch (error) {
        console.error("Failed to delete objectiveBreach:", error);
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
