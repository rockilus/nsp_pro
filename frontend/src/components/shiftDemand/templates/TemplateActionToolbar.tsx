import React from "react";
import { Box, Paper, Divider } from "@mui/material";
import { FilterSortSection } from "../toolbar/FilterSortSection";
import { BulkSelectionSection } from "../toolbar/BulkSelectionSection";
import { ColumnFilter, TableSort } from "../../../types/filter";

interface TemplateActionToolbarProps {
  lng: string;
  showBulkMode: boolean;
  showFilters: boolean;
  // Filter/Sort props
  filters: ColumnFilter[];
  sort: TableSort | null;
  onRemoveFilter: (filterId: string) => void;
  onRemoveSort: () => void;
  onResetAll: () => void;
  // Bulk selection props
  selectedCellsCount: number;
  bulkValue: string;
  onBulkValueChange: (value: string) => void;
  onApplyBulkChange: () => Promise<void>;
  onDeleteBulkSelection: () => Promise<void>;
  onCancelBulkMode: () => void;
}

export function TemplateActionToolbar({
  lng,
  showBulkMode,
  showFilters,
  // Filter/Sort props
  filters,
  sort,
  onRemoveFilter,
  onRemoveSort,
  onResetAll,
  // Bulk selection props
  selectedCellsCount,
  bulkValue,
  onBulkValueChange,
  onApplyBulkChange,
  onDeleteBulkSelection,
  onCancelBulkMode,
}: TemplateActionToolbarProps) {
  // Only render if there's something to show
  if (!showBulkMode && !showFilters) {
    return null;
  }

  const hasFiltersOrSort = filters.length > 0 || sort !== null;

  return (
    <Paper
      data-testid="template-action-toolbar"
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        width: "100%",
        margin: 0,
        padding: "8px 16px",
        backgroundColor: showBulkMode ? "primary.50" : "grey.50",
        borderTop: "1px solid",
        borderColor: "grey.100",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        minHeight="40px"
      >
        {/* Left side - Filters and Sort */}
        {showFilters && hasFiltersOrSort && (
          <FilterSortSection
            lng={lng}
            filters={filters}
            sort={sort}
            onRemoveFilter={onRemoveFilter}
            onRemoveSort={onRemoveSort}
            onResetAll={onResetAll}
          />
        )}

        {/* Spacer when only showing filters or bulk mode */}
        {!showBulkMode && showFilters && hasFiltersOrSort && <Box flex={1} />}
        {!showFilters && showBulkMode && <Box flex={1} />}

        {/* Divider between sections */}
        {showFilters && showBulkMode && hasFiltersOrSort && (
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        )}

        {/* Right side - Bulk Selection */}
        {showBulkMode && (
          <BulkSelectionSection
            lng={lng}
            selectedCellsCount={selectedCellsCount}
            bulkValue={bulkValue}
            onBulkValueChange={onBulkValueChange}
            onApplyBulkChange={onApplyBulkChange}
            onDeleteBulkSelection={onDeleteBulkSelection}
            onCancelBulkMode={onCancelBulkMode}
          />
        )}
      </Box>
    </Paper>
  );
}
