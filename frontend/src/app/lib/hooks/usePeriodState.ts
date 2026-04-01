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
  // If we're running in the browser, consider the hook hydrated on first render.
  // This avoids calling setState inside an effect (which triggers the lint rule).
  const [isHydrated, setIsHydrated] = useState<boolean>(() =>
    typeof window === "undefined" ? false : true,
  );

  // Initialize from storage lazily to avoid calling setState synchronously inside an effect.
  // loadState() handles server-side rendering (returns default when window is undefined).
  const [currentDate, setCurrentDateState] = useState<Dayjs>(() =>
    dayjs(loadState().currentDate),
  );
  const [periodType, setPeriodTypeState] = useState<PeriodType>(
    () => loadState().periodType,
  );

  // No effect needed: isHydrated is set from the environment at initialization.

  const setCurrentDate = useCallback(
    (date: Dayjs) => {
      setCurrentDateState(date);
      saveState(date, periodType);
    },
    [periodType],
  );

  const setPeriodType = useCallback(
    (type: PeriodType) => {
      setPeriodTypeState(type);
      saveState(currentDate, type);
    },
    [currentDate],
  );

  return {
    currentDate,
    periodType,
    setCurrentDate,
    setPeriodType,
    isHydrated,
  };
}
