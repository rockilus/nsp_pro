import dayjs from "dayjs";
import { useCallback, useMemo } from "react";
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
        // Ensure date is converted to UTC before serializing
        periodStartDate: settings.periodStartDate.utc().toISOString(),
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

      // Convert back to UTC dayjs object if it exists
      const settings: Partial<ScheduleViewSettingsT> = {
        ...parsed,
        periodStartDate: parsed.periodStartDate
          ? dayjs.utc(parsed.periodStartDate)
          : undefined,
      };

      // Validation will be done in the hook, just return the parsed settings
      return settings as ScheduleViewSettingsT;
    } catch (error) {
      console.warn(
        "Error deserializing schedule view settings, using defaults:",
        error,
      );
      // Return partial object - validation will fill in defaults
      return {} as ScheduleViewSettingsT;
    }
  },
};

export function useScheduleViewSettings(
  teamId: string,
  defaultSettings: ScheduleViewSettingsT,
): [
  ScheduleViewSettingsT,
  (updates: Partial<ScheduleViewSettingsT>) => void,
  () => void, // reset function
] {
  const storageKey = `scheduleViewSettings_${teamId}`;

  const [settings, setSettings] = useLocalStorageState(
    storageKey,
    defaultSettings,
    scheduleViewSettingsSerializer,
  );

  const updateSettings = useCallback(
    (updates: Partial<ScheduleViewSettingsT>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };
        // Validate before saving to ensure consistency
        return validateScheduleViewSettings(
          newSettings,
          defaultSettings.showDailyShiftDemands,
        );
      });
    },
    [setSettings, defaultSettings.showDailyShiftDemands],
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, [setSettings, defaultSettings]);

  // Ensure the current settings are always valid
  // Memoize to prevent creating new objects on every render
  const validatedSettings = useMemo(
    () =>
      validateScheduleViewSettings(
        settings,
        defaultSettings.showDailyShiftDemands,
      ),
    [settings, defaultSettings.showDailyShiftDemands],
  );

  return [validatedSettings, updateSettings, resetSettings];
}
