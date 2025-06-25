import dayjs from "dayjs";
import { useCallback } from "react";
import { ScheduleViewSettingsT } from "@/types/schedule";
import { useLocalStorageState } from "./useLocalStorageState";
import {
  SerializedScheduleViewSettings,
  validateScheduleViewSettings,
} from "../utils/scheduleViewSettingsUtils";

const scheduleViewSettingsSerializer = {
  serialize: (settings: ScheduleViewSettingsT): string => {
    try {
      const serialized: SerializedScheduleViewSettings = {
        ...settings,
        periodStartDate: settings.periodStartDate.toISOString(),
        periodEndDate: settings.periodEndDate.toISOString(),
      };
      return JSON.stringify(serialized);
    } catch (error) {
      console.warn("Error serializing schedule view settings:", error);
      // Return empty object as fallback - will use defaults on deserialize
      return JSON.stringify({});
    }
  },

  deserialize: (value: string): ScheduleViewSettingsT => {
    try {
      const parsed: Partial<SerializedScheduleViewSettings> = JSON.parse(value);

      // Convert back to dayjs objects if they exist
      const settings: Partial<ScheduleViewSettingsT> = {
        ...parsed,
        periodStartDate: parsed.periodStartDate
          ? dayjs(parsed.periodStartDate)
          : undefined,
        periodEndDate: parsed.periodEndDate
          ? dayjs(parsed.periodEndDate)
          : undefined,
      };

      // Validation will be done in the hook, just return the parsed settings
      return settings as ScheduleViewSettingsT;
    } catch (error) {
      console.warn(
        "Error deserializing schedule view settings, using defaults:",
        error
      );
      // Return partial object - validation will fill in defaults
      return {} as ScheduleViewSettingsT;
    }
  },
};

export function useScheduleViewSettings(
  teamId: string,
  defaultSettings: ScheduleViewSettingsT
): [
  ScheduleViewSettingsT,
  (updates: Partial<ScheduleViewSettingsT>) => void,
  () => void // reset function
] {
  const storageKey = `scheduleViewSettings_${teamId}`;

  const [settings, setSettings] = useLocalStorageState(
    storageKey,
    defaultSettings,
    scheduleViewSettingsSerializer
  );

  const updateSettings = useCallback(
    (updates: Partial<ScheduleViewSettingsT>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };
        // Validate before saving to ensure consistency
        return validateScheduleViewSettings(
          newSettings,
          defaultSettings.showDailyShiftDemands
        );
      });
    },
    [setSettings, defaultSettings.showDailyShiftDemands]
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, [setSettings, defaultSettings]);

  // Ensure the current settings are always valid
  const validatedSettings = validateScheduleViewSettings(
    settings,
    defaultSettings.showDailyShiftDemands
  );

  return [validatedSettings, updateSettings, resetSettings];
}
