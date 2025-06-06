import { useState, useMemo, useCallback } from "react";
import {
  ColumnFilter,
  TableSort,
  TableState,
  ColumnDefinition,
} from "../types/filter";

export function useTableState<T>(data: T[], columns: ColumnDefinition[]) {
  const [tableState, setTableState] = useState<TableState>({
    filters: [],
    sort: null,
  });

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
