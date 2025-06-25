import { useState, useEffect, useCallback } from "react";

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      // Server-side rendering - return default value
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }

      const parsed = serializer
        ? serializer.deserialize(item)
        : JSON.parse(item);

      // Additional validation: ensure the parsed value is not null/undefined
      return parsed !== null && parsed !== undefined ? parsed : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      // Try to clear the corrupted data
      try {
        localStorage.removeItem(key);
      } catch (removeError) {
        console.warn(
          `Error removing corrupted localStorage key "${key}":`,
          removeError
        );
      }
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(state) : value;
        setState(valueToStore);

        if (typeof window !== "undefined") {
          const serializedValue = serializer
            ? serializer.serialize(valueToStore)
            : JSON.stringify(valueToStore);
          localStorage.setItem(key, serializedValue);
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
        // If quota exceeded or other storage error, try to clear this key and use memory state
        try {
          localStorage.removeItem(key);
        } catch (removeError) {
          console.warn(
            `Error removing localStorage key "${key}":`,
            removeError
          );
        }
        // Still update the React state even if localStorage fails
        const valueToStore = value instanceof Function ? value(state) : value;
        setState(valueToStore);
      }
    },
    [key, state, serializer]
  );

  return [state, setValue];
}
