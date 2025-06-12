import { useState, useEffect, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import { PeriodType } from "@/types/shiftDemand";

interface PeriodState {
  currentDate: string; // ISO string
  periodType: PeriodType;
}

const STORAGE_KEY = "nsp_pro_period_state";

function getDefaultState(): PeriodState {
  return {
    currentDate: dayjs().toISOString(),
    periodType: "month" as PeriodType,
  };
}

function loadState(): PeriodState {
  if (typeof window === "undefined") return getDefaultState();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PeriodState;
      if (parsed.currentDate && parsed.periodType) {
        return parsed;
      }
    }
  } catch (error) {
    // ignore
  }
  return getDefaultState();
}

function saveState(currentDate: Dayjs, periodType: PeriodType) {
  if (typeof window === "undefined") return;
  try {
    const state: PeriodState = {
      currentDate: currentDate.toISOString(),
      periodType,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // ignore
  }
}

export function usePeriodState() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentDate, setCurrentDateState] = useState(() => dayjs());
  const [periodType, setPeriodTypeState] = useState<PeriodType>("month");

  useEffect(() => {
    const state = loadState();
    setCurrentDateState(dayjs(state.currentDate));
    setPeriodTypeState(state.periodType);
    setIsHydrated(true);
  }, []);

  const setCurrentDate = useCallback(
    (date: Dayjs) => {
      setCurrentDateState(date);
      saveState(date, periodType);
    },
    [periodType]
  );

  const setPeriodType = useCallback(
    (type: PeriodType) => {
      setPeriodTypeState(type);
      saveState(currentDate, type);
    },
    [currentDate]
  );

  return {
    currentDate,
    periodType,
    setCurrentDate,
    setPeriodType,
    isHydrated,
  };
}
