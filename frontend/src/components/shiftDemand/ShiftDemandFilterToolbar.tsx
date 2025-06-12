import React from "react";
import {
  Box,
  Paper,
  Button,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Chip,
  Typography,
  Divider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CancelIcon from "@mui/icons-material/Cancel";
import { Clear as ClearIcon, Sort as SortIcon } from "@mui/icons-material";
import { useTranslation } from "../../app/i18n/client";
import { ColumnFilter, TableSort } from "../../types/filter";

interface ShiftDemandFilterToolbarProps {
  lng: string;

  // Bulk selection props
  selectedCellsCount: number;
  bulkValue: string;
  onBulkValueChange: (value: string) => void;
  onApplyBulkChange: () => void;
  onDeleteBulkSelection: () => void;
  onCancelBulkMode: () => void;
  showBulkSelect: boolean;

  // Filter/sort props
  filters: ColumnFilter[];
  sort: TableSort | null;
  onRemoveFilter: (filterId: string) => void;
  onRemoveSort: () => void;
  onResetAll: () => void;
  showFilters: boolean;
}

export function ShiftDemandFilterToolbar({
  lng,
  selectedCellsCount,
  bulkValue,
  onBulkValueChange,
  onApplyBulkChange,
  onDeleteBulkSelection,
  onCancelBulkMode,
  showBulkSelect,
  filters,
  sort,
  onRemoveFilter,
  onRemoveSort,
  onResetAll,
  showFilters,
}: ShiftDemandFilterToolbarProps) {
  const { t } = useTranslation(lng, "shift-demands");

  if (!showBulkSelect && !showFilters) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        width: "100%",
        margin: 0,
        padding: "3px 16px",
        backgroundColor: showBulkSelect ? "primary.50" : "grey.50",
        borderTop: "1px solid",
        borderColor: "grey.100",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        minHeight="35px"
      >
        {/* Left side - Filters and Sort indicators */}
        <Box display="flex" alignItems="center" gap={1} flex={1}>
          {showFilters && (
            <>
              {sort && (
                <Chip
                  icon={<SortIcon />}
                  label={`Sort: ${sort.label} ${
                    sort.direction === "asc" ? "↑" : "↓"
                  }`}
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

              {(filters.length > 0 || sort) && (
                <Button
                  size="small"
                  onClick={onResetAll}
                  startIcon={<ClearIcon />}
                  sx={{ ml: 1 }}
                >
                  {t("reset")}
                </Button>
              )}
            </>
          )}
        </Box>

        {/* Divider between filters and bulk operations */}
        {showFilters && showBulkSelect && (
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        )}

        {/* Right side - Bulk operations */}
        {showBulkSelect && (
          <Box display="flex" alignItems="center" gap={2}>
            {/* Bulk mode status */}
            <Box display="flex" alignItems="center" gap={2}>
              <Chip
                label={t("bulk_mode_active")}
                color="primary"
                variant="outlined"
                size="small"
              />
              <Typography variant="body2">
                {t("selected_cells", { count: selectedCellsCount })}
              </Typography>
            </Box>

            {/* Bulk actions (only show if cells are selected) */}
            {selectedCellsCount > 0 && (
              <>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>{t("set_value")}</InputLabel>
                  <OutlinedInput
                    type="number"
                    value={bulkValue}
                    onChange={(e) => onBulkValueChange(e.target.value)}
                    inputProps={{ min: 0 }}
                    label={t("set_value")}
                    endAdornment={
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={onApplyBulkChange}
                          disabled={!bulkValue}
                        >
                          {t("apply")}
                        </Button>
                      </InputAdornment>
                    }
                  />
                </FormControl>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={onDeleteBulkSelection}
                  size="small"
                >
                  {t("delete")}
                </Button>
              </>
            )}

            {/* Cancel button */}
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={onCancelBulkMode}
              size="small"
            >
              {t("cancel")}
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
