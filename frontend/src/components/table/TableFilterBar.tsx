import React from "react";
import { Box, Chip, Button, Typography } from "@mui/material";
import { Clear as ClearIcon, Sort as SortIcon } from "@mui/icons-material";
import { ColumnFilter, TableSort } from "../../types/filter";

interface TableFilterBarProps {
  filters: ColumnFilter[];
  sort: TableSort | null;
  onRemoveFilter: (filterId: string) => void;
  onRemoveSort: () => void;
  onResetAll: () => void;
}

export default function TableFilterBar({
  filters,
  sort,
  onRemoveFilter,
  onRemoveSort,
  onResetAll,
}: TableFilterBarProps) {
  const hasActiveFilters = filters.length > 0 || sort !== null;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <Box sx={{ p: 2, backgroundColor: "grey.50", borderRadius: 1, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Active Filters & Sorting:
        </Typography>
        <Button
          size="small"
          onClick={onResetAll}
          startIcon={<ClearIcon />}
          sx={{ ml: "auto" }}
        >
          Clear All
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {sort && (
          <Chip
            icon={<SortIcon />}
            label={`Sort: ${sort.label} ${
              sort.direction === "asc" ? "↑" : "↓"
            }`}
            onDelete={onRemoveSort}
            variant="outlined"
            color="primary"
          />
        )}

        {filters.map((filter) => (
          <Chip
            key={filter.id}
            label={filter.label}
            onDelete={() => onRemoveFilter(filter.id)}
            variant="outlined"
            color="secondary"
          />
        ))}
      </Box>
    </Box>
  );
}
