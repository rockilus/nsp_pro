import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverPostCreateTimetableCategory,
  serverGetTimetableCategories,
  serverPostUpdateTimetableCategory,
  serverDeleteTimetableCategory,
} from "../api/timetable";
import { TimetableCategoriesState } from "../types/index";

const initialTimetableCategoriesState: TimetableCategoriesState = {
  currentTimetableCategories: null,
  error: "",
  postCreateTimetableCategory: async () => {},
  getTimetableCategories: async () => {},
  postUpdateTimetableCategory: async () => {},
  deleteTimetableCategory: async () => {},
  addToTimetableCategory: () => {},
};

export const TimetableCategoriesContext =
  createContext<TimetableCategoriesState>(initialTimetableCategoriesState);

interface TimetableCategoriesProviderProps {
  children: ReactNode;
}

export const TimetableCategoriesProvider = (
  props: TimetableCategoriesProviderProps
) => {
  const [timetableCategoriesState, setTimetableCategoriesState] =
    useState<TimetableCategoriesState>(initialTimetableCategoriesState);

  const postCreateTimetableCategory = useCallback(
    async (label: string, timetableId: string) => {
      const response = await serverPostCreateTimetableCategory(
        label,
        timetableId
      );

      setTimetableCategoriesState((prevState) => {
        if (!prevState.currentTimetableCategories) {
          return prevState;
        }
        return {
          ...prevState,
          currentTimetableCategories: [
            ...prevState.currentTimetableCategories,
            response.timetableCategory,
          ],
        };
      });
    },
    []
  );

  const getTimetableCategories = useCallback(async () => {
    const response = await serverGetTimetableCategories();
    setTimetableCategoriesState((oldValues) => {
      return {
        ...oldValues,
        currentTimetableCategories: response.timetableCategories,
      };
    });
  }, []);

  const postUpdateTimetableCategory = useCallback(
    async (timetableCategoryId: string, label: string) => {
      const response = await serverPostUpdateTimetableCategory(
        timetableCategoryId,
        label
      );

      setTimetableCategoriesState((prevState) => {
        if (!prevState.currentTimetableCategories) {
          return prevState;
        }

        const updatedTimetableCategories =
          prevState.currentTimetableCategories.map((timetableCategory) => {
            if (timetableCategory._id !== timetableCategoryId) {
              return timetableCategory;
            } else {
              return response.timetableCategory;
            }
          });

        return {
          ...prevState,
          currentTimetableCategories: updatedTimetableCategories,
        };
      });
    },
    []
  );

  const deleteTimetableCategory = useCallback(
    async (timetableCategoryId: string) => {
      const response = await serverDeleteTimetableCategory(timetableCategoryId);

      setTimetableCategoriesState((prevState) => {
        if (!prevState.currentTimetableCategories) {
          return prevState;
        }
        return {
          ...prevState,
          currentTimetableCategories:
            prevState.currentTimetableCategories.filter(
              (timetableCategory) =>
                timetableCategory._id !== timetableCategoryId
            ),
        };
      });
    },
    []
  );

  const addToTimetableCategory = useCallback(
    (timetableCategories: Record<string, any>[]) => {
      setTimetableCategoriesState((prevState) => {
        if (!prevState.currentTimetableCategories) {
          return prevState;
        }
        return {
          ...prevState,
          currentTimetableCategories: [
            ...prevState.currentTimetableCategories,
            ...timetableCategories,
          ],
        };
      });
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      ...timetableCategoriesState,
      postCreateTimetableCategory,
      getTimetableCategories,
      postUpdateTimetableCategory,
      deleteTimetableCategory,
      addToTimetableCategory,
    }),
    [
      timetableCategoriesState,
      postCreateTimetableCategory,
      getTimetableCategories,
      postUpdateTimetableCategory,
      deleteTimetableCategory,
      addToTimetableCategory,
    ]
  );

  return (
    <TimetableCategoriesContext.Provider value={contextValue}>
      {props.children}
    </TimetableCategoriesContext.Provider>
  );
};
