/**
 * Bulk Operations Toolbar component
 * Provides bulk editing capabilities for shift demand grid
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Box,
  Toolbar,
  Typography,
  IconButton,
  Button,
  TextField,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Clear as ClearIcon,
  MoreVert as MoreIcon,
  Functions as FunctionIcon,
  Pattern as PatternIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import {
  CellSelection,
  BulkOperation,
  DemandPattern,
} from "@/types/shiftDemand";

const ToolbarContainer = styled(Toolbar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  minHeight: "56px",
  padding: theme.spacing(0, 2),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

const ToolbarLeft = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 16,
});

const ToolbarRight = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const OperationGroup = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 4,
});

const ValueInput = styled(TextField)(({ theme }) => ({
  width: "80px",
  "& .MuiInputBase-root": {
    height: "32px",
    backgroundColor: theme.palette.background.paper,
    "& input": {
      textAlign: "center",
      padding: theme.spacing(0, 1),
    },
  },
}));

interface BulkOperationsToolbarProps {
  selectedCells: Set<string>;
  selectedData: CellSelection[];
  onBulkOperation: (operation: BulkOperation, value?: number) => void;
  onClearSelection: () => void;
  onCopySelection: () => void;
  onPasteSelection: () => void;
  onApplyPattern?: (pattern: DemandPattern) => void;
  onOpenSettings?: () => void;
  copiedData?: CellSelection[] | null;
  readonly?: boolean;
  patterns?: DemandPattern[];
}

export const BulkOperationsToolbar: React.FC<BulkOperationsToolbarProps> = ({
  selectedCells,
  selectedData,
  onBulkOperation,
  onClearSelection,
  onCopySelection,
  onPasteSelection,
  onApplyPattern,
  onOpenSettings,
  copiedData,
  readonly = false,
  patterns = [],
}) => {
  const [setValue, setSetValue] = useState<string>("1");
  const [incrementValue, setIncrementValue] = useState<string>("1");
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [patternMenuAnchor, setPatternMenuAnchor] =
    useState<null | HTMLElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<{
    operation: BulkOperation;
    value?: number;
  } | null>(null);

  const selectedCount = selectedCells.size;
  const totalValue = selectedData.reduce((sum, cell) => sum + cell.value, 0);
  const avgValue =
    selectedCount > 0 ? Math.round(totalValue / selectedCount) : 0;

  const handleBulkOperation = useCallback(
    (operation: BulkOperation, value?: number) => {
      // For destructive operations, show confirmation
      if (operation === "clear" && selectedCount > 10) {
        setPendingOperation({ operation, value });
        setShowConfirmDialog(true);
        return;
      }

      onBulkOperation(operation, value);
    },
    [onBulkOperation, selectedCount]
  );

  const handleConfirmOperation = useCallback(() => {
    if (pendingOperation) {
      onBulkOperation(pendingOperation.operation, pendingOperation.value);
      setPendingOperation(null);
    }
    setShowConfirmDialog(false);
  }, [pendingOperation, onBulkOperation]);

  const handleSetValue = useCallback(() => {
    const value = parseInt(setValue, 10);
    if (!isNaN(value) && value >= 0) {
      handleBulkOperation("set", value);
    }
  }, [setValue, handleBulkOperation]);

  const handleIncrement = useCallback(() => {
    const value = parseInt(incrementValue, 10);
    if (!isNaN(value)) {
      handleBulkOperation("increment", value);
    }
  }, [incrementValue, handleBulkOperation]);

  const handleDecrement = useCallback(() => {
    const value = parseInt(incrementValue, 10);
    if (!isNaN(value)) {
      handleBulkOperation("decrement", value);
    }
  }, [incrementValue, handleBulkOperation]);

  const handlePatternSelect = useCallback(
    (pattern: DemandPattern) => {
      if (onApplyPattern) {
        onApplyPattern(pattern);
      }
      setPatternMenuAnchor(null);
    },
    [onApplyPattern]
  );

  // Don't show toolbar if no cells selected
  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <ToolbarContainer>
        <ToolbarLeft>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={`${selectedCount} selected`}
              color="secondary"
              size="small"
              onDelete={onClearSelection}
              deleteIcon={<ClearIcon />}
            />
            <Typography variant="body2">
              Total: {totalValue} • Avg: {avgValue}
            </Typography>
          </Box>

          {!readonly && (
            <OperationGroup>
              <ValueInput
                size="small"
                value={setValue}
                onChange={(e) => setSetValue(e.target.value)}
                placeholder="Value"
                type="number"
                inputProps={{ min: 0 }}
              />
              <Tooltip title="Set selected cells to value">
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  onClick={handleSetValue}
                  disabled={!setValue || isNaN(parseInt(setValue, 10))}
                >
                  Set
                </Button>
              </Tooltip>
            </OperationGroup>
          )}
        </ToolbarLeft>

        <ToolbarRight>
          {!readonly && (
            <>
              {/* Increment/Decrement Operations */}
              <OperationGroup>
                <ValueInput
                  size="small"
                  value={incrementValue}
                  onChange={(e) => setIncrementValue(e.target.value)}
                  placeholder="±"
                  type="number"
                />
                <Tooltip title="Decrease by value">
                  <IconButton
                    size="small"
                    onClick={handleDecrement}
                    disabled={
                      !incrementValue || isNaN(parseInt(incrementValue, 10))
                    }
                    sx={{ color: "inherit" }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Increase by value">
                  <IconButton
                    size="small"
                    onClick={handleIncrement}
                    disabled={
                      !incrementValue || isNaN(parseInt(incrementValue, 10))
                    }
                    sx={{ color: "inherit" }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </OperationGroup>

              <Divider
                orientation="vertical"
                flexItem
                sx={{ bgcolor: "rgba(255,255,255,0.3)" }}
              />

              {/* Copy/Paste Operations */}
              <OperationGroup>
                <Tooltip title="Copy selected cells">
                  <IconButton
                    size="small"
                    onClick={onCopySelection}
                    sx={{ color: "inherit" }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Paste to selected cells">
                  <IconButton
                    size="small"
                    onClick={onPasteSelection}
                    disabled={!copiedData || copiedData.length === 0}
                    sx={{ color: "inherit" }}
                  >
                    <Badge
                      badgeContent={copiedData?.length || 0}
                      color="secondary"
                      invisible={!copiedData || copiedData.length === 0}
                    >
                      <PasteIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </OperationGroup>

              <Divider
                orientation="vertical"
                flexItem
                sx={{ bgcolor: "rgba(255,255,255,0.3)" }}
              />

              {/* Clear Operation */}
              <Tooltip title="Clear selected cells">
                <IconButton
                  size="small"
                  onClick={() => handleBulkOperation("clear")}
                  sx={{ color: "inherit" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* More Options Menu */}
          <IconButton
            size="small"
            onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
            sx={{ color: "inherit" }}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        </ToolbarRight>
      </ToolbarContainer>

      {/* More Options Menu */}
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={() => setMoreMenuAnchor(null)}
      >
        {!readonly && patterns.length > 0 && (
          <MenuItem onClick={(e) => setPatternMenuAnchor(e.currentTarget)}>
            <ListItemIcon>
              <PatternIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Apply Pattern</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={() => handleBulkOperation("clear")}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear All Selected</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            const stats = {
              count: selectedCount,
              total: totalValue,
              average: avgValue,
              min: Math.min(...selectedData.map((c) => c.value)),
              max: Math.max(...selectedData.map((c) => c.value)),
            };
            console.log("Selection Statistics:", stats);
            setMoreMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <FunctionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Show Statistics</ListItemText>
        </MenuItem>

        {onOpenSettings && (
          <MenuItem
            onClick={() => {
              onOpenSettings();
              setMoreMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Pattern Selection Menu */}
      <Menu
        anchorEl={patternMenuAnchor}
        open={Boolean(patternMenuAnchor)}
        onClose={() => setPatternMenuAnchor(null)}
      >
        {patterns.map((pattern) => (
          <MenuItem
            key={pattern.name}
            onClick={() => handlePatternSelect(pattern)}
          >
            <ListItemText
              primary={pattern.name}
              secondary={pattern.description}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Bulk Operation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {pendingOperation?.operation}{" "}
            {selectedCount} selected cells? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmOperation}
            variant="contained"
            color="error"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
