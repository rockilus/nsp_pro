import React from 'react';
import { Box, Paper, Divider } from '@mui/material';
import TableFilterBar from '../../table/TableFilterBar';
import { BulkSelectionSection } from './BulkSelectionSection';
import { MultitaskingSelectionSection } from './MultitaskingSelectionSection';
import { ShiftDemandActionToolbarProps } from './types';

export function ShiftDemandActionToolbar({
  lng,
  showBulkMode,
  showFilters,
  showMultitaskingMode = false,
  multitaskingProps,
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
}: ShiftDemandActionToolbarProps) {
  // Only render if there's something to show
  if (!showBulkMode && !showFilters && !showMultitaskingMode) {
    return null;
  }

  const hasFiltersOrSort = filters.length > 0 || sort !== null;

  return (
    <Paper
      data-testid="shift-demand-action-toolbar"
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        width: '100%',
        margin: 0,
        padding: '8px 16px',
        backgroundColor: showBulkMode
          ? 'primary.50'
          : showMultitaskingMode
            ? 'secondary.50'
            : 'grey.50',
        borderTop: '1px solid',
        borderColor: 'grey.100',
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
          <TableFilterBar
            lng={lng}
            filters={filters}
            sort={sort}
            onRemoveFilter={onRemoveFilter}
            onRemoveSort={onRemoveSort}
            onResetAll={onResetAll}
            inline
          />
        )}

        {/* Spacer when only showing filters, bulk mode, or multitasking mode */}
        {!showBulkMode && !showMultitaskingMode && showFilters && hasFiltersOrSort && (
          <Box flex={1} />
        )}
        {!showFilters && (showBulkMode || showMultitaskingMode) && <Box flex={1} />}

        {/* Divider between sections */}
        {showFilters && (showBulkMode || showMultitaskingMode) && hasFiltersOrSort && (
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

        {/* Right side - Multitasking Selection */}
        {showMultitaskingMode && multitaskingProps && (
          <MultitaskingSelectionSection {...multitaskingProps} />
        )}
      </Box>
    </Paper>
  );
}
