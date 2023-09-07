import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverGetWorkerParams,
  serverPostCreateWorkerParam,
  serverPostUpdateWorkerParam,
  serverDeleteWorkerParam,
} from "../api/configuration";
import { WorkerParamsState } from "../types/index";

const initialWorkerParamsState: WorkerParamsState = {
  currentWorkerParams: null,
  error: "",
  postCreateWorkerParam: async () => {},
  getWorkerParams: async () => {},
  postUpdateWorkerParam: async () => {},
  deleteWorkerParam: async () => {},
};

export const WorkerParamsContext = createContext<WorkerParamsState>(
  initialWorkerParamsState
);

interface WorkerParamsProviderProps {
  children: ReactNode;
}

export const WorkerParamsProvider = (props: WorkerParamsProviderProps) => {
  const [workerParamsState, setWorkerParamsState] = useState<WorkerParamsState>(
    initialWorkerParamsState
  );

  const postCreateWorkerParam = useCallback(
    async (label: string, entryType: string, entryOptions: string[]) => {
      const response = await serverPostCreateWorkerParam(
        label,
        entryType,
        entryOptions
      );
      setWorkerParamsState((oldValues) => {
        return { ...oldValues, currentWorkerParams: response.worker_params };
      });
    },
    []
  );

  const getWorkerParams = useCallback(async () => {
    const response = await serverGetWorkerParams();

    setWorkerParamsState((oldValues) => {
      return { ...oldValues, currentWorkerParams: response.worker_params };
    });
  }, []);

  const postUpdateWorkerParam = useCallback(
    async (
      workerParamId: string,
      label: string,
      entryType: string,
      entryOptions: string[]
    ) => {
      const response = await serverPostUpdateWorkerParam(
        workerParamId,
        label,
        entryType,
        entryOptions
      );
      setWorkerParamsState((prevState) => {
        if (!prevState.currentWorkerParams) {
          return prevState;
        }
        const updatedWorkerParams = prevState.currentWorkerParams.map(
          (workerParam) => {
            if (workerParam._id !== workerParamId) {
              return workerParam;
            } else if (workerParam._id === workerParamId) {
              return response.worker_param;
            }
          }
        );

        return {
          ...prevState,
          currentWorkerParams: updatedWorkerParams,
        };
      });
    },
    []
  );

  const deleteWorkerParam = useCallback(async (workerParamId: string) => {
    console.log("deleteWorker called");
    const response = await serverDeleteWorkerParam(workerParamId);

    setWorkerParamsState((prevState) => {
      if (!prevState.currentWorkerParams) {
        return prevState;
      }
      return {
        ...prevState,
        currentWorkerParams: prevState.currentWorkerParams.filter(
          (workerParam) => workerParam._id !== workerParamId
        ),
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...workerParamsState,
      postCreateWorkerParam,
      getWorkerParams,
      postUpdateWorkerParam,
      deleteWorkerParam,
    }),
    [
      workerParamsState,
      postCreateWorkerParam,
      getWorkerParams,
      postUpdateWorkerParam,
      deleteWorkerParam,
    ]
  );

  return (
    <WorkerParamsContext.Provider value={contextValue}>
      {props.children}
    </WorkerParamsContext.Provider>
  );
};
