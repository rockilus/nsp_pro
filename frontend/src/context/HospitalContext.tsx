import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import { postHospitalInfo, postHospitalOption } from "../api/configuration";

interface HospitalState {
  currentHospital: Record<string, string>;
  error?: string;
  createNewHospital: (name: string, userId: string) => Promise<void>;
  addOptionToProfile: (option: string, hospitalId: string) => Promise<void>;
}

const initialHospitalState: HospitalState = {
  currentHospital: {},
  error: "",
  createNewHospital: async () => {},
  addOptionToProfile: async () => {},
};

export const HospitalContext =
  createContext<HospitalState>(initialHospitalState);

interface HospitalProviderProps {
  children: ReactNode;
}

export const HospitalProvider = (props: HospitalProviderProps) => {
  const [hospitalState, setHospitalState] =
    useState<HospitalState>(initialHospitalState);

  const createNewHospital = useCallback(
    async (name: string, userId: string) => {
      const response = await postHospitalInfo(name, userId);
      setHospitalState((oldValues) => {
        return { ...oldValues, currentHospital: response };
      });
    },
    []
  );

  const addOptionToProfile = useCallback(
    async (option: string, hospitalId: string) => {
      const response = await postHospitalOption(option, hospitalId);
      setHospitalState((oldValues) => {
        return { ...oldValues, currentHospital: response };
      });
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      ...hospitalState,
      createNewHospital,
      addOptionToProfile,
    }),
    [hospitalState, createNewHospital, addOptionToProfile]
  );

  return (
    <HospitalContext.Provider value={contextValue}>
      {props.children}
    </HospitalContext.Provider>
  );
};
