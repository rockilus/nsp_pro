import { useCallback } from 'react';
import { useLocalStorageState } from './useLocalStorageState';

export type MobileRequestViewSettingsT = {
  mobileSelectedWorkerId: string | null;
  showPastRequests: boolean;
};

export type SerializedMobileRequestViewSettings = {
  mobileSelectedWorkerId: string | null;
  showPastRequests: boolean;
};

const mobileRequestViewSettingsSerializer = {
  serialize: (settings: MobileRequestViewSettingsT): string => {
    try {
      const serialized: SerializedMobileRequestViewSettings = {
        mobileSelectedWorkerId: settings.mobileSelectedWorkerId,
        showPastRequests: settings.showPastRequests,
      };
      return JSON.stringify(serialized);
    } catch (error) {
      console.warn('Error serializing request view settings:', error);
      return JSON.stringify({});
    }
  },

  deserialize: (value: string): MobileRequestViewSettingsT => {
    try {
      const parsed: Partial<SerializedMobileRequestViewSettings> = JSON.parse(value);
      const settings: MobileRequestViewSettingsT = {
        mobileSelectedWorkerId: parsed.mobileSelectedWorkerId ?? null,
        showPastRequests: parsed.showPastRequests ?? false,
      };
      return settings;
    } catch (error) {
      console.warn('Error deserializing request view settings, using defaults:', error);
      return {
        mobileSelectedWorkerId: null,
        showPastRequests: false,
      };
    }
  },
};

export function getDefaultRequestViewSettings(): MobileRequestViewSettingsT {
  return {
    mobileSelectedWorkerId: null,
    showPastRequests: false,
  };
}

export function useMobileRequestViewSettings(
  teamId: string,
  defaultSettings: MobileRequestViewSettingsT,
): [
  MobileRequestViewSettingsT,
  (updates: Partial<MobileRequestViewSettingsT>) => void,
  () => void, // reset function
] {
  const storageKey = `mobileRequestViewSettings_${teamId}`;

  const [settings, setSettings] = useLocalStorageState(
    storageKey,
    defaultSettings,
    mobileRequestViewSettingsSerializer,
  );

  const updateSettings = useCallback(
    (updates: Partial<MobileRequestViewSettingsT>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    [setSettings],
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, [setSettings, defaultSettings]);

  return [settings, updateSettings, resetSettings];
}
