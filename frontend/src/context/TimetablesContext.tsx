import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverGetTimetables,
  serverPostCreateTimetable,
  serverDeleteTimetable,
} from "../api/timetable";
import { TimetablesState } from "../types/index";

const initialTimetablesState: TimetablesState = {
  currentTimetables: null,
  error: "",
  postCreateTimetable: async () => {},
  getTimetables: async () => {},
  deleteTimetable: async () => {},
};

export const TimetablesContext = createContext<TimetablesState>(
  initialTimetablesState
);

interface TimetablesProviderProps {
  children: ReactNode;
}

export const TimetablesProvider = (props: TimetablesProviderProps) => {
  const [timetablesState, setTimetablesState] = useState<TimetablesState>(
    initialTimetablesState
  );

  const postCreateTimetable = useCallback(async () => {
    const response = await serverPostCreateTimetable();
    setTimetablesState((prevState) => {
      if (!prevState.currentTimetables) {
        return prevState;
      }
      return {
        ...prevState,
        currentTimetables: [...prevState.currentTimetables, response.timetable],
      };
    });
  }, []);

  const getTimetables = useCallback(async () => {
    const response = await serverGetTimetables();
    setTimetablesState((oldValues) => {
      return { ...oldValues, currentTimetables: response.timetables };
    });
  }, []);

  const deleteTimetable = useCallback(async (timetableId: string) => {
    const response = await serverDeleteTimetable(timetableId);

    setTimetablesState((prevState) => {
      if (!prevState.currentTimetables) {
        return prevState;
      }
      return {
        ...prevState,
        currentTimetables: prevState.currentTimetables.filter(
          (timetable) => timetable.timetable._id !== timetableId
        ),
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...timetablesState,
      postCreateTimetable,
      getTimetables,
      deleteTimetable,
    }),
    [timetablesState, postCreateTimetable, getTimetables, deleteTimetable]
  );

  return (
    <TimetablesContext.Provider value={contextValue}>
      {props.children}
    </TimetablesContext.Provider>
  );
};
