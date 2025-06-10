/**
 * Bulk Operations Manager component
 * Provides advanced bulk editing features with operation history and undo
 */

"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  History as HistoryIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { CellChange, BulkOperation } from "@/types/shiftDemand";

const ManagerContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const OperationHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

const OperationHistory = styled(Box)(({ theme }) => ({
  maxHeight: "200px",
  overflow: "auto",
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

interface BulkOperationRecord {
  id: string;
  operation: BulkOperation;
  changes: CellChange[];
  timestamp: number;
  description: string;
}

interface BulkOperationsManagerProps {
  isProcessing: boolean;
  progress?: number;
  onUndo: (record: BulkOperationRecord) => void;
  onRedo: (record: BulkOperationRecord) => void;
  onClearHistory: () => void;
  maxHistorySize?: number;
}

export const BulkOperationsManager: React.FC<BulkOperationsManagerProps> = ({
  isProcessing,
  progress = 0,
  onUndo,
  onRedo,
  onClearHistory,
  maxHistorySize = 50,
}) => {
  const [operationHistory, setOperationHistory] = useState<
    BulkOperationRecord[]
  >([]);
  const [redoHistory, setRedoHistory] = useState<BulkOperationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const operationIdRef = useRef(0);

  // Add new operation to history
  const addOperation = useCallback(
    (operation: BulkOperation, changes: CellChange[], description?: string) => {
      const record: BulkOperationRecord = {
        id: `op_${Date.now()}_${++operationIdRef.current}`,
        operation,
        changes,
        timestamp: Date.now(),
        description:
          description || `${operation} operation on ${changes.length} cells`,
      };

      setOperationHistory((prev) => {
        const newHistory = [record, ...prev];
        // Limit history size
        if (newHistory.length > maxHistorySize) {
          return newHistory.slice(0, maxHistorySize);
        }
        return newHistory;
      });

      // Clear redo history when new operation is added
      setRedoHistory([]);
    },
    [maxHistorySize]
  );

  const handleUndo = useCallback(() => {
    if (operationHistory.length === 0) return;

    const lastOperation = operationHistory[0];

    // Move to redo history
    setRedoHistory((prev) => [lastOperation, ...prev]);
    setOperationHistory((prev) => prev.slice(1));

    onUndo(lastOperation);
  }, [operationHistory, onUndo]);

  const handleRedo = useCallback(() => {
    if (redoHistory.length === 0) return;

    const nextOperation = redoHistory[0];

    // Move back to operation history
    setOperationHistory((prev) => [nextOperation, ...prev]);
    setRedoHistory((prev) => prev.slice(1));

    onRedo(nextOperation);
  }, [redoHistory, onRedo]);

  const handleClearHistory = useCallback(() => {
    setOperationHistory([]);
    setRedoHistory([]);
    onClearHistory();
  }, [onClearHistory]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatOperationType = (operation: BulkOperation) => {
    switch (operation) {
      case "set":
        return "Set Values";
      case "increment":
        return "Increment";
      case "decrement":
        return "Decrement";
      case "clear":
        return "Clear";
      case "copy":
        return "Copy";
      case "paste":
        return "Paste";
      default:
        return operation;
    }
  };

  const getOperationColor = (operation: BulkOperation) => {
    switch (operation) {
      case "set":
        return "primary";
      case "increment":
        return "success";
      case "decrement":
        return "warning";
      case "clear":
        return "error";
      case "copy":
        return "info";
      case "paste":
        return "secondary";
      default:
        return "default";
    }
  };

  // Don't render if no operations and not processing
  if (
    operationHistory.length === 0 &&
    redoHistory.length === 0 &&
    !isProcessing
  ) {
    return null;
  }

  return (
    <ManagerContainer>
      <OperationHeader>
        <Typography variant="subtitle1">Bulk Operations</Typography>

        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Undo last operation">
            <span>
              <IconButton
                size="small"
                onClick={handleUndo}
                disabled={operationHistory.length === 0 || isProcessing}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Redo last undone operation">
            <span>
              <IconButton
                size="small"
                onClick={handleRedo}
                disabled={redoHistory.length === 0 || isProcessing}
              >
                <RedoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Show operation history">
            <IconButton
              size="small"
              onClick={() => setShowHistory((prev) => !prev)}
            >
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear all history">
            <span>
              <IconButton
                size="small"
                onClick={handleClearHistory}
                disabled={
                  operationHistory.length === 0 && redoHistory.length === 0
                }
                color="error"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </OperationHeader>

      {/* Processing Progress */}
      {isProcessing && (
        <ProgressContainer>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Typography variant="body2" color="text.secondary">
              Processing bulk operation...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} />
        </ProgressContainer>
      )}

      {/* Operation Statistics */}
      <Box display="flex" gap={1} mb={2}>
        <Chip
          label={`${operationHistory.length} operations`}
          size="small"
          variant="outlined"
        />
        {redoHistory.length > 0 && (
          <Chip
            label={`${redoHistory.length} undone`}
            size="small"
            variant="outlined"
            color="secondary"
          />
        )}
      </Box>

      {/* Operation History */}
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" color="text.secondary">
          Operation History
        </Typography>
        <IconButton
          size="small"
          onClick={() => setShowHistory((prev) => !prev)}
        >
          {showHistory ? (
            <CollapseIcon fontSize="small" />
          ) : (
            <ExpandIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      <Collapse in={showHistory}>
        <OperationHistory>
          {operationHistory.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              No operations performed yet
            </Alert>
          ) : (
            <List dense>
              {operationHistory.map((record, index) => (
                <ListItem key={record.id}>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={formatOperationType(record.operation)}
                          size="small"
                          color={getOperationColor(record.operation) as any}
                          variant="outlined"
                        />
                        <Typography variant="body2">
                          {record.changes.length} cells
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {record.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(record.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Undo this operation">
                      <IconButton
                        size="small"
                        onClick={() => {
                          // Find all operations after this one and undo them first
                          const operationsToUndo = operationHistory.slice(
                            0,
                            index + 1
                          );
                          operationsToUndo.reverse().forEach((op) => {
                            handleUndo();
                          });
                        }}
                        disabled={isProcessing}
                      >
                        <UndoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </OperationHistory>
      </Collapse>

      {/* Expose the addOperation function for parent components */}
      {React.createElement("div", {
        ref: (el: any) => {
          if (el) {
            (el as any).addOperation = addOperation;
          }
        },
        style: { display: "none" },
      })}
    </ManagerContainer>
  );
};

// Export the addOperation function type for parent components
export type BulkOperationsManagerRef = {
  addOperation: (
    operation: BulkOperation,
    changes: CellChange[],
    description?: string
  ) => void;
};
