import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverGetShiftParams,
  serverPostCreateShiftParam,
  serverPostUpdateShiftParam,
  serverDeleteShiftParam,
} from "../api/configuration";
import { ShiftParamsState } from "../types/index";

const initialShiftParamsState: ShiftParamsState = {
  currentShiftParams: null,
  error: "",
  postCreateShiftParam: async () => {},
  getShiftParams: async () => {},
  postUpdateShiftParam: async () => {},
  deleteShiftParam: async () => {},
};

export const ShiftParamsContext = createContext<ShiftParamsState>(
  initialShiftParamsState
);

interface ShiftParamsProviderProps {
  children: ReactNode;
}

export const ShiftParamsProvider = (props: ShiftParamsProviderProps) => {
  const [shiftParamsState, setShiftParamsState] = useState<ShiftParamsState>(
    initialShiftParamsState
  );

  const postCreateShiftParam = useCallback(
    async (label: string, entryType: string, entryOptions: string[]) => {
      const response = await serverPostCreateShiftParam(
        label,
        entryType,
        entryOptions
      );
      setShiftParamsState((oldValues) => {
        return { ...oldValues, currentShiftParams: response.shift_params };
      });
    },
    []
  );

  const getShiftParams = useCallback(async () => {
    const response = await serverGetShiftParams();

    setShiftParamsState((oldValues) => {
      return { ...oldValues, currentShiftParams: response.shift_params };
    });
  }, []);

  const postUpdateShiftParam = useCallback(
    async (
      shiftParamId: string,
      label: string,
      entryType: string,
      entryOptions: string[]
    ) => {
      const response = await serverPostUpdateShiftParam(
        shiftParamId,
        label,
        entryType,
        entryOptions
      );
      setShiftParamsState((prevState) => {
        if (!prevState.currentShiftParams) {
          return prevState;
        }
        const updatedShiftParams = prevState.currentShiftParams.map(
          (shiftParam) => {
            if (shiftParam._id !== shiftParamId) {
              return shiftParam;
            } else if (shiftParam._id === shiftParamId) {
              return response.shift_param;
            }
          }
        );

        return {
          ...prevState,
          currentShiftParams: updatedShiftParams,
        };
      });
    },
    []
  );

  const deleteShiftParam = useCallback(async (shiftParamId: string) => {
    console.log("deleteShift called");
    const response = await serverDeleteShiftParam(shiftParamId);

    setShiftParamsState((prevState) => {
      if (!prevState.currentShiftParams) {
        return prevState;
      }
      return {
        ...prevState,
        currentShiftParams: prevState.currentShiftParams.filter(
          (shiftParam) => shiftParam._id !== shiftParamId
        ),
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...shiftParamsState,
      postCreateShiftParam,
      getShiftParams,
      postUpdateShiftParam,
      deleteShiftParam,
    }),
    [
      shiftParamsState,
      postCreateShiftParam,
      getShiftParams,
      postUpdateShiftParam,
      deleteShiftParam,
    ]
  );

  return (
    <ShiftParamsContext.Provider value={contextValue}>
      {props.children}
    </ShiftParamsContext.Provider>
  );
};
