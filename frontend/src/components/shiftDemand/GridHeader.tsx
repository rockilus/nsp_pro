/**
 * Header component for the shift demand grid
 * Shows period information, summary stats, and bulk operation controls
 */

"use client";

import React from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Toolbar,
  Button,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Clear as ClearIcon,
  GetApp as ExportIcon,
  FileUpload as ImportIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { GridDisplayOptions } from "@/types/shiftDemand";
import { DateUtils } from "@/app/lib/utils/shiftDemandUtils";

const HeaderContainer = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  minHeight: 64,
}));

const HeaderLeft = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 16,
});

const HeaderRight = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const PeriodInfo = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
});

const BulkControls = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 4,
});

interface GridHeaderProps {
  startDate: Dayjs;
  endDate: Dayjs;
  totalDemands: number;
  selectedCells: Set<string>;
  onClearSelection: () => void;
  onBulkSet?: (value: number) => void;
  onBulkClear?: () => void;
  onCopySelection?: () => void;
  onPasteSelection?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onOpenTemplates?: () => void;
  onOpenPatterns?: () => void;
  onToggleSidebar?: () => void;
  displayOptions: GridDisplayOptions;
  onDisplayOptionsChange?: (options: Partial<GridDisplayOptions>) => void;
}

export const GridHeader: React.FC<GridHeaderProps> = ({
  startDate,
  endDate,
  totalDemands,
  selectedCells,
  onClearSelection,
  onBulkSet,
  onBulkClear,
  onCopySelection,
  onPasteSelection,
  onExport,
  onImport,
  onOpenTemplates,
  onOpenPatterns,
  onToggleSidebar,
  displayOptions,
  onDisplayOptionsChange,
}) => {
  const selectedCount = selectedCells.size;
  const periodDays = endDate.diff(startDate, "day") + 1;

  const formatDateRange = () => {
    const start = startDate.format("MMM D");
    const end = endDate.format("MMM D, YYYY");
    return `${start} - ${end}`;
  };

  return (
    <HeaderContainer>
      <HeaderLeft>
        <PeriodInfo>
          <Typography variant="h6" component="h2">
            Shift Demands
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDateRange()} • {periodDays} days • {totalDemands} total
            demands
          </Typography>
        </PeriodInfo>

        {selectedCount > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={`${selectedCount} selected`}
              color="primary"
              size="small"
              onDelete={onClearSelection}
              deleteIcon={<ClearIcon />}
            />

            <BulkControls>
              <Tooltip title="Copy selected cells">
                <IconButton
                  size="small"
                  onClick={onCopySelection}
                  disabled={!onCopySelection}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Paste to selected cells">
                <IconButton
                  size="small"
                  onClick={onPasteSelection}
                  disabled={!onPasteSelection}
                >
                  <PasteIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Clear selected cells">
                <IconButton
                  size="small"
                  onClick={onBulkClear}
                  disabled={!onBulkClear}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </BulkControls>
          </Box>
        )}
      </HeaderLeft>

      <HeaderRight>
        <Tooltip title="Export shift demands">
          <IconButton onClick={onExport} disabled={!onExport}>
            <Badge badgeContent={totalDemands > 0 ? "●" : 0} color="success">
              <ExportIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Import shift demands">
          <IconButton onClick={onImport} disabled={!onImport}>
            <ImportIcon />
          </IconButton>
        </Tooltip>
      </HeaderRight>
    </HeaderContainer>
  );
};
