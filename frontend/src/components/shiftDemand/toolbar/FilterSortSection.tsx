import React from "react";
import { Box, Button, Chip } from "@mui/material";
import { Clear as ClearIcon, Sort as SortIcon } from "@mui/icons-material";
import { useTranslation } from "../../../app/i18n/client";
import { FilterSortProps } from "./types";

export function FilterSortSection({
  lng,
  filters,
  sort,
  onRemoveFilter,
  onRemoveSort,
  onResetAll,
}: FilterSortProps) {
  const { t } = useTranslation(lng, "shift-demands");

  const hasFiltersOrSort = filters.length > 0 || sort !== null;

  if (!hasFiltersOrSort) {
    return null;
  }

  return (
    <Box display="flex" alignItems="center" gap={1} flex={1}>
      {sort && (
        <Chip
          icon={<SortIcon />}
          label={`Sort: ${sort.label} ${sort.direction === "asc" ? "↑" : "↓"}`}
          onDelete={onRemoveSort}
          variant="outlined"
          color="primary"
          size="small"
        />
      )}

      {filters.map((filter) => (
        <Chip
          key={filter.id}
          label={filter.label}
          onDelete={() => onRemoveFilter(filter.id)}
          variant="outlined"
          color="secondary"
          size="small"
        />
      ))}

      <Button
        size="small"
        onClick={onResetAll}
        startIcon={<ClearIcon />}
        sx={{ ml: 1 }}
      >
        {t("reset")}
      </Button>
    </Box>
  );
}
