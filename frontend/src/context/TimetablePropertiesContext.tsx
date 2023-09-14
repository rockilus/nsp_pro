import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverPostCreateTimetableProperty,
  serverGetTimetableProperties,
  serverPostUpdateTimetableProperty,
  serverDeleteTimetableProperty,
} from "../api/timetable";
import { TimetablePropertiesState } from "../types/index";

const initialTimetablePropertiesState: TimetablePropertiesState = {
  currentTimetableProperties: null,
  error: "",
  postCreateTimetableProperty: async () => {},
  getTimetableProperties: async () => {},
  postUpdateTimetableProperty: async () => {},
  deleteTimetableProperty: async () => {},
  addToTimetableProperty: () => {},
};

export const TimetablePropertiesContext =
  createContext<TimetablePropertiesState>(initialTimetablePropertiesState);

interface TimetablePropertiesProviderProps {
  children: ReactNode;
}

export const TimetablePropertiesProvider = (
  props: TimetablePropertiesProviderProps
) => {
  const [timetablePropertiesState, setTimetablePropertiesState] =
    useState<TimetablePropertiesState>(initialTimetablePropertiesState);

  const postCreateTimetableProperty = useCallback(
    async (
      label: string,
      timetableId: string,
      timetableCategoryId: string,
      timetableTimeId: string
    ) => {
      const response = await serverPostCreateTimetableProperty(
        label,
        timetableId,
        timetableCategoryId,
        timetableTimeId
      );

      setTimetablePropertiesState((prevState) => {
        if (!prevState.currentTimetableProperties) {
          return prevState;
        }
        return {
          ...prevState,
          currentTimetableProperties: [
            ...prevState.currentTimetableProperties,
            response.timetableProperty,
          ],
        };
      });
    },
    []
  );

  const getTimetableProperties = useCallback(async () => {
    const response = await serverGetTimetableProperties();
    setTimetablePropertiesState((oldValues) => {
      return {
        ...oldValues,
        currentTimetableProperties: response.timetableProperties,
      };
    });
  }, []);

  const postUpdateTimetableProperty = useCallback(
    async (timetablePropertyId: string, label: string) => {
      const response = await serverPostUpdateTimetableProperty(
        timetablePropertyId,
        label
      );

      setTimetablePropertiesState((prevState) => {
        if (!prevState.currentTimetableProperties) {
          return prevState;
        }

        const updatedTimetableProperties =
          prevState.currentTimetableProperties.map((timetableProperty) => {
            if (timetableProperty._id !== timetablePropertyId) {
              return timetableProperty;
            } else {
              return response.timetableProperty;
            }
          });

        return {
          ...prevState,
          currentTimetableProperties: updatedTimetableProperties,
        };
      });
    },
    []
  );

  const deleteTimetableProperty = useCallback(
    async (timetablePropertyId: string) => {
      const response = await serverDeleteTimetableProperty(timetablePropertyId);

      setTimetablePropertiesState((prevState) => {
        if (!prevState.currentTimetableProperties) {
          return prevState;
        }
        return {
          ...prevState,
          currentTimetableProperties:
            prevState.currentTimetableProperties.filter(
              (timetableProperty) =>
                timetableProperty._id !== timetablePropertyId
            ),
        };
      });
    },
    []
  );

  const addToTimetableProperty = useCallback(
    (timetableProperties: Record<string, any>[]) => {
      setTimetablePropertiesState((prevState) => {
        if (!prevState.currentTimetableProperties) {
          return prevState;
        }
        return {
          ...prevState,
          currentTimetableProperties: [
            ...prevState.currentTimetableProperties,
            ...timetableProperties,
          ],
        };
      });
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      ...timetablePropertiesState,
      postCreateTimetableProperty,
      getTimetableProperties,
      postUpdateTimetableProperty,
      deleteTimetableProperty,
      addToTimetableProperty,
    }),
    [
      timetablePropertiesState,
      postCreateTimetableProperty,
      getTimetableProperties,
      postUpdateTimetableProperty,
      deleteTimetableProperty,
      addToTimetableProperty,
    ]
  );

  return (
    <TimetablePropertiesContext.Provider value={contextValue}>
      {props.children}
    </TimetablePropertiesContext.Provider>
  );
};
