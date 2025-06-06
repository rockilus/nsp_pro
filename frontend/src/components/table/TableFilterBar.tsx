import React from "react";
import { Box, Chip, Button } from "@mui/material";
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
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 1,
          maxHeight: "80px", // Approximately 2 lines of chips (32px each + gap)
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
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

        <Button
          size="small"
          onClick={onResetAll}
          startIcon={<ClearIcon />}
          sx={{
            ml: "auto",
            flexShrink: 0, // Prevent button from shrinking
            alignSelf: "flex-start", // Keep button at top when scrolling
          }}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
}
