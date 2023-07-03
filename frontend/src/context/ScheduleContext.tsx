import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Dayjs } from "dayjs";

import {
  postGetScheduleXDays,
  postGetScheduleList,
  postBuildSchedule,
} from "../api/configuration";
import { ScheduleState } from "../types/index";

const initialScheduleState: ScheduleState = {
  currentSchedule: null,
  currentScheduleList: null,
  currentScheduleData: null,
  error: "",
  getScheduleXDays: async () => {},
  getScheduleList: async () => {},
  buildSchedule: async () => {},
};

export const ScheduleContext =
  createContext<ScheduleState>(initialScheduleState);

interface ScheduleProviderProps {
  children: ReactNode;
}

export const ScheduleProvider = (props: ScheduleProviderProps) => {
  const [scheduleState, setScheduleState] =
    useState<ScheduleState>(initialScheduleState);

  const getScheduleXDays = useCallback(
    async (hospitalId: string, startDate: Dayjs, numDays: number) => {
      const response = await postGetScheduleXDays(
        hospitalId,
        startDate,
        numDays
      );
      setScheduleState((oldValues) => {
        return {
          ...oldValues,
          currentSchedule: response.schedule,
          currentScheduleData: response.schedule_data_list,
        };
      });
    },
    []
  );

  const getScheduleList = useCallback(
    async (hospitalId: string, startDate: Dayjs, endDate: Dayjs) => {
      const response = await postGetScheduleList(
        hospitalId,
        startDate,
        endDate
      );
      setScheduleState((oldValues) => {
        return {
          ...oldValues,
          currentScheduleList: response.schedule_list,
          currentScheduleData: response.schedule_data_list,
        };
      });
    },
    []
  );

  const buildSchedule = useCallback(
    async (
      hospitalId: string,
      authorId: string,
      startDate: Dayjs,
      endDate: Dayjs
    ) => {
      const response = await postBuildSchedule(
        hospitalId,
        authorId,
        startDate,
        endDate
      );
      setScheduleState((oldValues) => {
        return { ...oldValues, currentSchedule: response.schedule };
      });
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      ...scheduleState,
      getScheduleXDays,
      getScheduleList,
      buildSchedule,
    }),
    [scheduleState, getScheduleXDays, getScheduleList, buildSchedule]
  );

  return (
    <ScheduleContext.Provider value={contextValue}>
      {props.children}
    </ScheduleContext.Provider>
  );
};
