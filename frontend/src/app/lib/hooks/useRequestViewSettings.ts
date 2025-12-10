import { useCallback } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

export type RequestViewSettingsT = {
  mobileSelectedWorkerId: string | null;
  showPastRequests: boolean;
};

export type SerializedRequestViewSettings = {
  mobileSelectedWorkerId: string | null;
  showPastRequests: boolean;
};

const requestViewSettingsSerializer = {
  serialize: (settings: RequestViewSettingsT): string => {
    try {
      const serialized: SerializedRequestViewSettings = {
        mobileSelectedWorkerId: settings.mobileSelectedWorkerId,
        showPastRequests: settings.showPastRequests,
      };
      return JSON.stringify(serialized);
    } catch (error) {
      console.warn("Error serializing request view settings:", error);
      return JSON.stringify({});
    }
  },

  deserialize: (value: string): RequestViewSettingsT => {
    try {
      const parsed: Partial<SerializedRequestViewSettings> = JSON.parse(value);
      const settings: RequestViewSettingsT = {
        mobileSelectedWorkerId: parsed.mobileSelectedWorkerId ?? null,
        showPastRequests: parsed.showPastRequests ?? false,
      };
      return settings;
    } catch (error) {
      console.warn(
        "Error deserializing request view settings, using defaults:",
        error
      );
      return {
        mobileSelectedWorkerId: null,
        showPastRequests: false,
      };
    }
  },
};

export function getDefaultRequestViewSettings(): RequestViewSettingsT {
  return {
    mobileSelectedWorkerId: null,
    showPastRequests: false,
  };
}

export function useRequestViewSettings(
  teamId: string,
  defaultSettings: RequestViewSettingsT
): [
  RequestViewSettingsT,
  (updates: Partial<RequestViewSettingsT>) => void,
  () => void // reset function
] {
  const storageKey = `requestViewSettings_${teamId}`;

  const [settings, setSettings] = useLocalStorageState(
    storageKey,
    defaultSettings,
    requestViewSettingsSerializer
  );

  const updateSettings = useCallback(
    (updates: Partial<RequestViewSettingsT>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    [setSettings]
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, [setSettings, defaultSettings]);

  return [settings, updateSettings, resetSettings];
}
