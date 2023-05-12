import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  deleteHospitalOption,
  postHospitalInfo,
  postHospitalOption,
  postHospitalInfoRequest,
  postParameterUpdate,
} from "../api/configuration";
import { HospitalState } from "../types/index";

const initialHospitalState: HospitalState = {
  currentHospital: null,
  error: "",
  createNewHospital: async () => {},
  addOptionToProfile: async () => {},
  deleteOptionFromProfile: async () => {},
  getHospital: async () => {},
  updateParameter: async () => {},
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
        return { ...oldValues, currentHospital: response.hospital };
      });
    },
    []
  );

  const addOptionToProfile = useCallback(
    async (option: string, dictPath: string[], hospitalId: string) => {
      const response = await postHospitalOption(option, dictPath, hospitalId);
      setHospitalState((oldValues) => {
        return { ...oldValues, currentHospital: response.hospital };
      });
    },
    []
  );

  const deleteOptionFromProfile = useCallback(
    async (dictPath: string[], hospitalId: string) => {
      const response = await deleteHospitalOption(dictPath, hospitalId);
      setHospitalState((oldValues) => {
        return { ...oldValues, currentHospital: response.hospital };
      });
    },
    []
  );

  const getHospital = useCallback(async (hospitalId: string) => {
    const response = await postHospitalInfoRequest(hospitalId);
    setHospitalState((oldValues) => {
      return { ...oldValues, currentHospital: response.hospital };
    });
  }, []);

  const updateParameter = useCallback(
    async (parameter: string, value: string, hospitalId: string) => {
      const response = await postParameterUpdate(parameter, value, hospitalId);
      setHospitalState((prevState) => {
        return { ...prevState, currentHospital: response.hospital };
      });
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      ...hospitalState,
      createNewHospital,
      addOptionToProfile,
      deleteOptionFromProfile,
      getHospital,
      updateParameter,
    }),
    [
      hospitalState,
      createNewHospital,
      addOptionToProfile,
      deleteOptionFromProfile,
      getHospital,
      updateParameter,
    ]
  );

  return (
    <HospitalContext.Provider value={contextValue}>
      {props.children}
    </HospitalContext.Provider>
  );
};
