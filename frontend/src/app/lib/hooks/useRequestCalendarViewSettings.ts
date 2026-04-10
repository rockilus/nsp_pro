import dayjs from 'dayjs';
import { useCallback, useMemo } from 'react';
import { RequestViewSettingsT } from '@/types/request';
import { useLocalStorageState } from './useLocalStorageState';
import {
  validateRequestCalendarViewSettings,
  getDefaultRequestCalendarViewSettings,
} from '../utils/requestCalendarViewSettingsUtils';

// Serialized version includes all request view settings with periodStartDate as ISO string
interface SerializedRequestViewSettings {
  selectedTab: 'table' | 'calendar';
  filters: any[];
  sort: any;
  timeFrame: 'week' | 'month';
  periodStartDate: string; // ISO string
}

const requestViewSettingsSerializer = {
  serialize: (settings: RequestViewSettingsT): string => {
    try {
      const serialized: SerializedRequestViewSettings = {
        selectedTab: settings.selectedTab,
        filters: settings.filters,
        sort: settings.sort,
        timeFrame: settings.timeFrame,
        // Ensure date is converted to UTC before serializing
        periodStartDate: settings.periodStartDate.utc().toISOString(),
      };
      return JSON.stringify(serialized);
    } catch (error) {
      console.warn('Error serializing request view settings:', error);
      // Return empty object as fallback - will use defaults on deserialize
      return JSON.stringify({});
    }
  },

  deserialize: (value: string): RequestViewSettingsT => {
    try {
      const parsed: Partial<SerializedRequestViewSettings> = JSON.parse(value);

      // Get defaults to fill in any missing fields
      const defaults = {
        selectedTab: 'table' as const,
        filters: [],
        sort: null,
        ...getDefaultRequestCalendarViewSettings(),
      };

      // Merge parsed values with defaults
      const settings: RequestViewSettingsT = {
        selectedTab:
          parsed.selectedTab === 'table' || parsed.selectedTab === 'calendar'
            ? parsed.selectedTab
            : defaults.selectedTab,
        filters: Array.isArray(parsed.filters) ? parsed.filters : defaults.filters,
        sort: parsed.sort !== undefined ? parsed.sort : defaults.sort,
        timeFrame:
          parsed.timeFrame === 'week' || parsed.timeFrame === 'month'
            ? parsed.timeFrame
            : defaults.timeFrame,
        periodStartDate: parsed.periodStartDate
          ? dayjs.utc(parsed.periodStartDate)
          : defaults.periodStartDate,
      };

      return settings;
    } catch (error) {
      console.warn('Error deserializing request view settings, using defaults:', error);
      // Return complete defaults on error
      return {
        selectedTab: 'table',
        filters: [],
        sort: null,
        ...getDefaultRequestCalendarViewSettings(),
      };
    }
  },
};

/**
 * Hook for managing the complete request view settings including:
 * - selectedTab (table vs calendar view)
 * - filters and sort (for table filtering)
 * - timeFrame and periodStartDate (for calendar navigation)
 *
 * All settings are persisted to localStorage with team-scoped storage key.
 */
export function useRequestViewSettings(
  teamId: string,
): [RequestViewSettingsT, (updates: Partial<RequestViewSettingsT>) => void, () => void] {
  const storageKey = `requestViewSettings_${teamId}`;

  const defaultSettings = useMemo<RequestViewSettingsT>(
    () => ({
      selectedTab: 'table',
      filters: [],
      sort: null,
      ...getDefaultRequestCalendarViewSettings(),
    }),
    [],
  );

  const [settings, setSettings] = useLocalStorageState(
    storageKey,
    defaultSettings,
    requestViewSettingsSerializer,
  );

  const updateSettings = useCallback(
    (updates: Partial<RequestViewSettingsT>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };

        // Validate calendar settings if they're being updated
        if (updates.timeFrame !== undefined || updates.periodStartDate !== undefined) {
          const validatedCalendar = validateRequestCalendarViewSettings({
            timeFrame: newSettings.timeFrame,
            periodStartDate: newSettings.periodStartDate,
          });
          return {
            ...newSettings,
            timeFrame: validatedCalendar.timeFrame,
            periodStartDate: validatedCalendar.periodStartDate,
          };
        }

        return newSettings;
      });
    },
    [setSettings],
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, [setSettings, defaultSettings]);

  // Ensure the current settings are always valid
  const validatedSettings = useMemo(() => {
    const validatedCalendar = validateRequestCalendarViewSettings({
      timeFrame: settings.timeFrame,
      periodStartDate: settings.periodStartDate,
    });

    return {
      ...settings,
      timeFrame: validatedCalendar.timeFrame,
      periodStartDate: validatedCalendar.periodStartDate,
    };
  }, [settings]);

  return [validatedSettings, updateSettings, resetSettings];
}
