import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  postCreateUser,
  postHospitalUsersRequest,
  postUserProfile,
} from "../api/configuration";
import { DoctorsState } from "../types/index";

const initialDoctorsState: DoctorsState = {
  currentDoctors: null,
  error: "",
  createUser: async () => {},
  getHospitalUsers: async () => {},
  saveUserProfile: async () => {},
};

export const DoctorsContext = createContext<DoctorsState>(initialDoctorsState);

interface DoctorsProviderProps {
  children: ReactNode;
}

export const DoctorsProvider = (props: DoctorsProviderProps) => {
  const [doctorsState, setDoctorsState] =
    useState<DoctorsState>(initialDoctorsState);

  const createUser = useCallback(
    async (
      firstName: string,
      lastName: string,
      email: string,
      hospitalId: string
    ) => {
      console.log("createUser called");

      const response = await postCreateUser(
        firstName,
        lastName,
        email,
        hospitalId
      );
      setDoctorsState((prevState) => {
        if (!prevState.currentDoctors) {
          return prevState;
        }
        return {
          ...prevState,
          currentDoctors: prevState.currentDoctors.map((doctor) => {
            return doctor._id === response.user._id ? response.user : doctor;
          }),
        };
      });
    },
    []
  );

  const getHospitalUsers = useCallback(async (hospitalId: string) => {
    const response = await postHospitalUsersRequest(hospitalId);
    setDoctorsState((oldValues) => {
      return { ...oldValues, currentDoctors: response.users };
    });
  }, []);

  const saveUserProfile = useCallback(
    async (userProfile: Record<string, any>, userId: string) => {
      const response = await postUserProfile(userProfile, userId);
      setDoctorsState((prevState) => {
        if (!prevState.currentDoctors) {
          return prevState;
        }
        return {
          ...prevState,
          currentDoctors: prevState.currentDoctors.map((doctor) => {
            return doctor._id === response.user._id ? response.user : doctor;
          }),
        };
      });
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      ...doctorsState,
      createUser,
      getHospitalUsers,
      saveUserProfile,
    }),
    [doctorsState, createUser, getHospitalUsers, saveUserProfile]
  );

  return (
    <DoctorsContext.Provider value={contextValue}>
      {props.children}
    </DoctorsContext.Provider>
  );
};
