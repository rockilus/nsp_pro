import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverPostCreateWorker,
  serverGetWorkers,
  serverPostUpdateWorkerProperty,
  serverDeleteWorker,
} from "../api/configuration";
import { WorkersState } from "../types/index";

const initialWorkersState: WorkersState = {
  currentWorkers: null,
  error: "",
  postCreateWorker: async () => {},
  getWorkers: async () => {},
  postUpdateWorkerProperty: async () => {},
  deleteWorker: async () => {},
};

export const WorkersContext = createContext<WorkersState>(initialWorkersState);

interface WorkersProviderProps {
  children: ReactNode;
}

export const WorkersProvider = (props: WorkersProviderProps) => {
  const [workersState, setWorkersState] =
    useState<WorkersState>(initialWorkersState);

  const postCreateWorker = useCallback(async (worker: Record<string, any>) => {
    console.log("createWorker called");

    const response = await serverPostCreateWorker();

    setWorkersState((prevState) => {
      if (!prevState.currentWorkers) {
        return prevState;
      }
      return {
        ...prevState,
        currentWorkers: [...prevState.currentWorkers, response.worker],
      };
    });
  }, []);

  const getWorkers = useCallback(async () => {
    const response = await serverGetWorkers();
    setWorkersState((oldValues) => {
      return { ...oldValues, currentWorkers: response.workers };
    });
  }, []);

  const postUpdateWorkerProperty = useCallback(
    async (workerId: string, workerParamId: string, value: any) => {
      console.log("postUpdateWorkerProperty called");

      const response = await serverPostUpdateWorkerProperty(
        workerId,
        workerParamId,
        value
      );

      setWorkersState((prevState) => {
        if (!prevState.currentWorkers) {
          return prevState;
        }

        const updatedWorkers = prevState.currentWorkers.map((worker) => {
          if (worker.worker._id !== workerId) {
            return worker;
          }

          let found = false;
          const updatedWorkerProperties = worker.worker_properties.map(
            (workerProperty) => {
              if (workerProperty._id !== response.updated_worker_property._id) {
                return workerProperty;
              } else if (
                workerProperty._id === response.updated_worker_property._id
              ) {
                console.log("workerProperty: ", workerProperty);
                console.log(
                  "response.updated_worker_property: ",
                  response.updated_worker_property
                );
                found = true;
                return response.updated_worker_property;
              }
            }
          );
          if (!found) {
            updatedWorkerProperties.push(response.updated_worker_property);
          }

          const updatedWorker = {
            ...worker,
            worker_properties: updatedWorkerProperties,
          };
          return updatedWorker;
        });

        console.log("prevState: ", prevState);
        console.log("updatedWorkers: ", updatedWorkers);

        return {
          ...prevState,
          currentWorkers: updatedWorkers,
        };
      });
    },
    []
  );

  const deleteWorker = useCallback(async (workerId: string) => {
    console.log("deleteWorker called");
    const response = await serverDeleteWorker(workerId);

    setWorkersState((prevState) => {
      if (!prevState.currentWorkers) {
        return prevState;
      }
      return {
        ...prevState,
        currentWorkers: prevState.currentWorkers.filter(
          (worker) => worker.worker._id !== workerId
        ),
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...workersState,
      postCreateWorker,
      getWorkers,
      postUpdateWorkerProperty,
      deleteWorker,
    }),
    [
      workersState,
      postCreateWorker,
      getWorkers,
      postUpdateWorkerProperty,
      deleteWorker,
    ]
  );

  return (
    <WorkersContext.Provider value={contextValue}>
      {props.children}
    </WorkersContext.Provider>
  );
};
