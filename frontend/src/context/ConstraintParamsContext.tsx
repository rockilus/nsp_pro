import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import { serverGetConstraintParams } from "../api/constraint";
import { ConstraintParamsState } from "../types/index";

const initialConstraintParamsState: ConstraintParamsState = {
  currentConstraintParams: null,
  error: "",
  getConstraintParams: async () => {},
};

export const ConstraintParamsContext = createContext<ConstraintParamsState>(
  initialConstraintParamsState
);

interface ConstraintParamsProviderProps {
  children: ReactNode;
}

export const ConstraintParamsProvider = (
  props: ConstraintParamsProviderProps
) => {
  const [constraintParamsState, setConstraintParamsState] =
    useState<ConstraintParamsState>(initialConstraintParamsState);

  const getConstraintParams = useCallback(async () => {
    const response = await serverGetConstraintParams();

    setConstraintParamsState((oldValues) => {
      return {
        ...oldValues,
        currentConstraintParams: response.constraint_param,
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...constraintParamsState,
      getConstraintParams,
    }),
    [constraintParamsState, getConstraintParams]
  );

  return (
    <ConstraintParamsContext.Provider value={contextValue}>
      {props.children}
    </ConstraintParamsContext.Provider>
  );
};
