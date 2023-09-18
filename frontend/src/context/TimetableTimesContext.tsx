import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverPostCreateTimetableTime,
  serverGetTimetableTimes,
  serverPostUpdateTimetableTime,
  serverDeleteTimetableTime,
} from "../api/timetable";
import { TimetableTimesState } from "../types/index";

const initialTimetableTimesState: TimetableTimesState = {
  currentTimetableTimes: null,
  error: "",
  postCreateTimetableTime: async () => {},
  getTimetableTimes: async () => {},
  postUpdateTimetableTime: async () => {},
  deleteTimetableTime: async () => {},
};

export const TimetableTimesContext = createContext<TimetableTimesState>(
  initialTimetableTimesState
);

interface TimetableTimesProviderProps {
  children: ReactNode;
}

export const TimetableTimesProvider = (props: TimetableTimesProviderProps) => {
  const [timetableTimesState, setTimetableTimesState] =
    useState<TimetableTimesState>(initialTimetableTimesState);

  const postCreateTimetableTime = useCallback(
    async (label: string, timetableId: string) => {
      const response = await serverPostCreateTimetableTime(label, timetableId);

      setTimetableTimesState((prevState) => {
        if (!prevState.currentTimetableTimes) {
          return prevState;
        }
        return {
          ...prevState,
          currentTimetableTimes: [
            ...prevState.currentTimetableTimes,
            response.timetableTime,
          ],
        };
      });
    },
    []
  );

  const getTimetableTimes = useCallback(async () => {
    const response = await serverGetTimetableTimes();
    setTimetableTimesState((oldValues) => {
      return {
        ...oldValues,
        currentTimetableTimes: response.timetableTimes,
      };
    });
  }, []);

  const postUpdateTimetableTime = useCallback(
    async (timetableTimeId: string, label: string) => {
      const response = await serverPostUpdateTimetableTime(
        timetableTimeId,
        label
      );

      setTimetableTimesState((prevState) => {
        if (!prevState.currentTimetableTimes) {
          return prevState;
        }

        const updatedTimetableTimes = prevState.currentTimetableTimes.map(
          (timetableTime) => {
            if (timetableTime._id !== timetableTimeId) {
              return timetableTime;
            } else {
              return response.timetableTime;
            }
          }
        );

        return {
          ...prevState,
          currentTimetableTimes: updatedTimetableTimes,
        };
      });
    },
    []
  );

  const deleteTimetableTime = useCallback(async (timetableTimeId: string) => {
    const response = await serverDeleteTimetableTime(timetableTimeId);

    setTimetableTimesState((prevState) => {
      if (!prevState.currentTimetableTimes) {
        return prevState;
      }
      return {
        ...prevState,
        currentTimetableTimes: prevState.currentTimetableTimes.filter(
          (timetableTime) => timetableTime._id !== timetableTimeId
        ),
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...timetableTimesState,
      postCreateTimetableTime,
      getTimetableTimes,
      postUpdateTimetableTime,
      deleteTimetableTime,
    }),
    [
      timetableTimesState,
      postCreateTimetableTime,
      getTimetableTimes,
      postUpdateTimetableTime,
      deleteTimetableTime,
    ]
  );

  return (
    <TimetableTimesContext.Provider value={contextValue}>
      {props.children}
    </TimetableTimesContext.Provider>
  );
};
