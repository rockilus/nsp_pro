import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { ObjectiveBreachT, VariableT } from "../components/Schedule/types";

dayjs.extend(utc);

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlObjectiveBreach = baseApiUrl + "/objectiveBreaches";

type ObjectiveBreachStateT = {
  objectiveBreaches: ObjectiveBreachT[];
  fetchObjectiveBreaches: () => void;
  addObjectiveBreach: (objectiveBreach: ObjectiveBreachT) => void;
  updateObjectiveBreachStore: (
    updatedObjectiveBreaches: ObjectiveBreachT[]
  ) => void;
  updateObjectiveBreach: (updatedObjectiveBreach: ObjectiveBreachT) => void;
  deleteObjectiveBreach: (id: string) => void;
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

    fetchObjectiveBreaches: async () => {
      const options: RequestInit = {
        method: "GET",
        credentials: "include" as RequestCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      };
      try {
        const response = await fetch(apiUrlObjectiveBreach, options);
        const data = await response.json();
        console.log("data", data);

        const objectiveBreaches: ObjectiveBreachT[] =
          data.map(toObjectiveBreachT);
        set({ objectiveBreaches });
      } catch (error) {
        console.error("Failed to fetch objectiveBreach:", error);
      }
    },

    addObjectiveBreach: async (objectiveBreach) => {
      try {
        const response = await fetch(apiUrlObjectiveBreach, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(objectiveBreach),
        });
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
      // console.log("updatedObjectiveBreaches", updatedObjectiveBreaches);
      updatedObjectiveBreaches.forEach((updatedObjectiveBreach) => {
        //   console.log("updatedObjectiveBreach", updatedObjectiveBreach);

        set((state) => ({
          objectiveBreaches: state.objectiveBreaches.find(
            (s) => s.id === updatedObjectiveBreach.id
          )
            ? state.objectiveBreaches.map((s) =>
                s.id === updatedObjectiveBreach.id ? updatedObjectiveBreach : s
              )
            : [...state.objectiveBreaches, updatedObjectiveBreach],
        }));
      });
    },

    updateObjectiveBreach: async (updatedObjectiveBreach) => {
      try {
        const response = await fetch(
          `${apiUrlObjectiveBreach}/${updatedObjectiveBreach.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedObjectiveBreach),
          }
        );
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

    deleteObjectiveBreach: async (id) => {
      try {
        await fetch(`${apiUrlObjectiveBreach}/${id}`, {
          method: "DELETE",
        });
        set((state) => ({
          objectiveBreaches: state.objectiveBreaches.filter((s) => s.id !== id),
        }));
      } catch (error) {
        console.error("Failed to delete objectiveBreach:", error);
      }
    },
  })
);
