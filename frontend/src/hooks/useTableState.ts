import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ColumnFilter,
  TableSort,
  TableState,
  ColumnDefinition,
} from "../types/filter";

// Security constants for LocalStorage persistence
const MAX_STORAGE_SIZE = 1024 * 10; // 10KB limit
const STORAGE_VERSION = "1.0";

// Validation functions for security
function isValidFilter(filter: any): filter is ColumnFilter {
  if (!filter || typeof filter !== "object") return false;

  const { id, type, value } = filter;

  // Validate required fields
  if (typeof id !== "string" || id.length > 100) return false;
  if (!["text", "select", "date", "boolean"].includes(type)) return false;

  // Validate value based on type
  switch (type) {
    case "text":
      return typeof value === "string" && value.length <= 500;
    case "select":
      return Array.isArray(value)
        ? value.every((v) => typeof v === "string" && v.length <= 100) &&
            value.length <= 50
        : typeof value === "string" && value.length <= 100;
    case "date":
      return (
        typeof value === "object" &&
        value !== null &&
        (!value.start || typeof value.start === "string") &&
        (!value.end || typeof value.end === "string")
      );
    case "boolean":
      return typeof value === "boolean";
    default:
      return false;
  }
}

function isValidSort(sort: any): sort is TableSort {
  if (!sort || typeof sort !== "object") return false;
  const { columnId, direction } = sort;
  return (
    typeof columnId === "string" &&
    columnId.length <= 100 &&
    ["asc", "desc"].includes(direction)
  );
}

function sanitizeString(str: string): string {
  // Remove potentially dangerous characters and limit length
  return str.replace(/[<>'"&]/g, "").substring(0, 500);
}

function loadTableState(
  storageKey: string,
  columns: ColumnDefinition[]
): TableState {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return { filters: [], sort: null };

    // Check size limit
    if (stored.length > MAX_STORAGE_SIZE) {
      console.warn("Table state exceeds size limit, resetting");
      localStorage.removeItem(storageKey);
      return { filters: [], sort: null };
    }

    const parsed = JSON.parse(stored);

    // Version check
    if (parsed.version !== STORAGE_VERSION) {
      console.info("Table state version mismatch, resetting");
      localStorage.removeItem(storageKey);
      return { filters: [], sort: null };
    }

    const state = parsed.state;
    if (!state || typeof state !== "object") {
      return { filters: [], sort: null };
    }

    // Validate and sanitize filters
    const validFilters: ColumnFilter[] = [];
    if (Array.isArray(state.filters)) {
      for (const filter of state.filters) {
        if (isValidFilter(filter)) {
          // Only include filters for columns that exist
          const column = columns.find((col) => col.id === filter.id);
          if (column) {
            // Sanitize string values
            if (filter.type === "text" && typeof filter.value === "string") {
              filter.value = sanitizeString(filter.value);
            } else if (
              filter.type === "select" &&
              Array.isArray(filter.value)
            ) {
              filter.value = filter.value.map((v) =>
                typeof v === "string" ? sanitizeString(v) : v
              );
            }
            validFilters.push(filter);
          }
        }
      }
    }

    // Validate sort
    let validSort: TableSort | null = null;
    if (state.sort && isValidSort(state.sort)) {
      // Only include sort for columns that exist
      const column = columns.find((col) => col.id === state.sort.columnId);
      if (column) {
        validSort = state.sort;
      }
    }

    return {
      filters: validFilters,
      sort: validSort,
    };
  } catch (error) {
    console.error("Error loading table state:", error);
    // Clear potentially corrupted data
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error("Error clearing storage:", e);
    }
    return { filters: [], sort: null };
  }
}

function saveTableState(storageKey: string, state: TableState): void {
  try {
    const toSave = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      state,
    };

    const serialized = JSON.stringify(toSave);

    // Check size limit
    if (serialized.length > MAX_STORAGE_SIZE) {
      console.warn("Table state too large to save");
      return;
    }

    localStorage.setItem(storageKey, serialized);
  } catch (error) {
    console.error("Error saving table state:", error);
    // If storage is full, try to clear this key and retry once
    try {
      localStorage.removeItem(storageKey);
      const toSave = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        state,
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (retryError) {
      console.error("Error saving table state on retry:", retryError);
    }
  }
}

export function useTableState<T>(
  data: T[],
  columns: ColumnDefinition[],
  storageKey?: string
) {
  // Initialize state with persistence if storageKey provided
  const [tableState, setTableState] = useState<TableState>(() => {
    if (storageKey && typeof window !== "undefined") {
      return loadTableState(storageKey, columns);
    }
    return { filters: [], sort: null };
  });

  // Save state to localStorage when it changes
  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      saveTableState(storageKey, tableState);
    }
  }, [tableState, storageKey]);

  const addFilter = useCallback((filter: ColumnFilter) => {
    setTableState((prev) => ({
      ...prev,
      filters: [...prev.filters.filter((f) => f.id !== filter.id), filter],
    }));
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setTableState((prev) => ({
      ...prev,
      filters: prev.filters.filter((f) => f.id !== filterId),
    }));
  }, []);

  const updateSort = useCallback((sort: TableSort | null) => {
    setTableState((prev) => ({
      ...prev,
      sort,
    }));
  }, []);

  const resetAll = useCallback(() => {
    setTableState({
      filters: [],
      sort: null,
    });
  }, []);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    tableState.filters.forEach((filter) => {
      const column = columns.find((col) => col.id === filter.id);
      if (!column) return;

      result = result.filter((item) => {
        const value = column.getValue(item);

        switch (filter.type) {
          case "text":
            return String(value)
              .toLowerCase()
              .includes(String(filter.value).toLowerCase());

          case "select":
            return Array.isArray(filter.value)
              ? filter.value.includes(value)
              : value === filter.value;

          case "date":
            if (!filter.value.start || !filter.value.end) return true;
            const itemDate = new Date(value);
            const startDate = new Date(filter.value.start);
            const endDate = new Date(filter.value.end);
            return itemDate >= startDate && itemDate <= endDate;

          case "boolean":
            return value === filter.value;

          default:
            return true;
        }
      });
    });

    // Apply sorting
    if (tableState.sort) {
      const column = columns.find(
        (col) => col.id === tableState.sort!.columnId
      );
      if (column) {
        result.sort((a, b) => {
          const aValue = column.getValue(a);
          const bValue = column.getValue(b);

          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;

          return tableState.sort!.direction === "desc"
            ? -comparison
            : comparison;
        });
      }
    }

    return result;
  }, [data, tableState, columns]);

  return {
    tableState,
    filteredAndSortedData,
    addFilter,
    removeFilter,
    updateSort,
    resetAll,
  };
}
