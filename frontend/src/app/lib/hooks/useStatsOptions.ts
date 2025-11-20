import dayjs from "dayjs";
import { useCallback } from "react";
import { StatsOptionsT } from "@/types/stats";
import { useLocalStorageState } from "./useLocalStorageState";
import {
  SerializedStatsOptions,
  validateStatsOptions,
} from "../utils/statsOptionsUtils";

const statsOptionsSerializer = {
  serialize: (options: StatsOptionsT): string => {
    try {
      const serialized: SerializedStatsOptions = {
        ...options,
        // Ensure dates are converted to UTC before serializing
        startDate: options.startDate.utc().toISOString(),
        endDate: options.endDate.utc().toISOString(),
      };
      return JSON.stringify(serialized);
    } catch (error) {
      console.warn("Error serializing stats options:", error);
      // Return empty object as fallback - will use defaults on deserialize
      return JSON.stringify({});
    }
  },

  deserialize: (value: string): StatsOptionsT => {
    try {
      const parsed: Partial<SerializedStatsOptions> = JSON.parse(value);

      // Convert back to UTC dayjs objects if they exist
      const options: Partial<StatsOptionsT> = {
        ...parsed,
        startDate: parsed.startDate ? dayjs.utc(parsed.startDate) : undefined,
        endDate: parsed.endDate ? dayjs.utc(parsed.endDate) : undefined,
      };

      // Validation will be done in the hook, just return the parsed options
      return options as StatsOptionsT;
    } catch (error) {
      console.warn("Error deserializing stats options, using defaults:", error);
      // Return partial object - validation will fill in defaults
      return {} as StatsOptionsT;
    }
  },
};

export function useStatsOptions(
  teamId: string,
  defaultOptions: StatsOptionsT
): [
  StatsOptionsT,
  (updates: Partial<StatsOptionsT>) => void,
  () => void // reset function
] {
  const storageKey = `statsOptions_${teamId}`;

  const [options, setOptions] = useLocalStorageState(
    storageKey,
    defaultOptions,
    statsOptionsSerializer
  );

  const updateOptions = useCallback(
    (updates: Partial<StatsOptionsT>) => {
      setOptions((prev) => {
        const newOptions = { ...prev, ...updates };
        // Validate before saving to ensure consistency
        return validateStatsOptions(newOptions);
      });
    },
    [setOptions]
  );

  const resetOptions = useCallback(() => {
    setOptions(defaultOptions);
  }, [setOptions, defaultOptions]);

  // Ensure the current options are always valid
  const validatedOptions = validateStatsOptions(options);

  return [validatedOptions, updateOptions, resetOptions];
}
