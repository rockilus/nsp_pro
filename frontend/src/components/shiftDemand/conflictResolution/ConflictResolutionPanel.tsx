/**
 * Conflict resolution UI for handling data conflicts in shift demand managem// Helper function to format shift demand value
const formatDemandValue = (value: number | undefined): string => {
  if (value === undefined || value === null) return "—";
  return value.toString();
};

// Helper function to get conflict severity
const getConflictSeverity = (
  conflict: ConflictResolution
): "low" | "medium" | "high" => {
  const affectedCellsCount = conflict.localChanges.length + conflict.serverChanges.length;
  if (affectedCellsCount <= 2) return "low";
  if (affectedCellsCount <= 5) return "medium";
  return "high";
};s visual interface for resolving conflicts when optimistic updates fail
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Compare as CompareIcon,
  Merge as MergeIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ConflictResolution, CellChange } from "@/types/shiftDemand";

interface ConflictResolutionDialogProps {
  open: boolean;
  conflict: ConflictResolution | null;
  onResolve: (
    conflictId: string,
    resolution: "local" | "server" | "merge"
  ) => void;
  onClose: () => void;
  shifts?: Array<{ id: string; name: string }>;
}

interface ConflictResolutionPanelProps {
  conflicts: Map<string, ConflictResolution>;
  onResolveConflict: (
    conflictId: string,
    resolution: "local" | "server" | "merge"
  ) => void;
  onResolveAll: (resolution: "local" | "server") => void;
  shifts?: Array<{ id: string; name: string }>;
}

// Helper function to format shift demand value
const formatDemandValue = (value: number | undefined): string => {
  if (value === undefined || value === null) return "—";
  return value.toString();
};

// Helper function to get conflict severity
const getConflictSeverity = (
  conflict: ConflictResolution
): "low" | "medium" | "high" => {
  const totalChanges =
    conflict.localChanges.length + conflict.serverChanges.length;
  if (totalChanges > 5) return "high";
  if (totalChanges > 2) return "medium";
  return "low";
};

// Individual conflict dialog
export const ConflictResolutionDialog: React.FC<
  ConflictResolutionDialogProps
> = ({ open, conflict, onResolve, onClose, shifts = [] }) => {
  const [selectedResolution, setSelectedResolution] = useState<
    "local" | "server" | "merge"
  >("local");

  const handleResolve = useCallback(() => {
    if (conflict) {
      onResolve(conflict.id, selectedResolution);
    }
  }, [conflict, selectedResolution, onResolve]);

  if (!conflict) return null;

  const getShiftName = (shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    return shift?.name || `Shift ${shiftId.slice(-4)}`;
  };

  const severity = getConflictSeverity(conflict);
  const severityColor =
    severity === "high" ? "error" : severity === "medium" ? "warning" : "info";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color={severityColor} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Resolve Data Conflict
          </Typography>
          <Chip
            label={`${severity.toUpperCase()} PRIORITY`}
            color={severityColor}
            size="small"
            variant="outlined"
          />
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity={severityColor} sx={{ mb: 3 }}>
          <Typography variant="body2">
            A conflict occurred when saving your changes. The data on the server
            has been modified by another user or process. Please choose how to
            resolve this conflict.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Conflict Details
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Detected: {format(new Date(conflict.timestamp), "PPpp")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Local changes: {conflict.localChanges.length}, Server changes:{" "}
            {conflict.serverChanges.length}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">Resolution Strategy</FormLabel>
          <RadioGroup
            value={selectedResolution}
            onChange={(e) =>
              setSelectedResolution(
                e.target.value as "local" | "server" | "merge"
              )
            }
          >
            <FormControlLabel
              value="local"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">Keep My Changes</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overwrite server data with your local changes
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="server"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">Use Server Version</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Discard your changes and use the current server data
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="merge"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">Merge Changes</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Combine both versions (where possible)
                  </Typography>
                </Box>
              }
              disabled // TODO: Implement merge logic
            />
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom>
          Conflicting Changes
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Shift</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Your Value</TableCell>
                <TableCell align="center">Server Value</TableCell>
                <TableCell align="center">Original</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Show local changes */}
              {conflict.localChanges.map((change, index) => (
                <TableRow key={`local-${index}`}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ScheduleIcon fontSize="small" color="action" />
                      {getShiftName(change.shiftId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {format(new Date(change.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatDemandValue(change.newValue)}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label="—"
                      color="default"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatDemandValue(change.oldValue)}
                      color="default"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {/* Show server changes */}
              {conflict.serverChanges.map((change, index) => (
                <TableRow key={`server-${index}`}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ScheduleIcon fontSize="small" color="action" />
                      {getShiftName(change.shiftId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {format(new Date(change.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label="—"
                      color="default"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatDemandValue(change.newValue)}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatDemandValue(change.oldValue)}
                      color="default"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleResolve}
          variant="contained"
          startIcon={<CheckCircleIcon />}
          color={selectedResolution === "server" ? "warning" : "primary"}
        >
          Apply Resolution
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Conflict resolution panel for multiple conflicts
export const ConflictResolutionPanel: React.FC<
  ConflictResolutionPanelProps
> = ({ conflicts, onResolveConflict, onResolveAll, shifts = [] }) => {
  const [selectedConflict, setSelectedConflict] =
    useState<ConflictResolution | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const conflictsArray = Array.from(conflicts.values());
  const highPriorityConflicts = conflictsArray.filter(
    (c) => getConflictSeverity(c) === "high"
  ).length;
  const mediumPriorityConflicts = conflictsArray.filter(
    (c) => getConflictSeverity(c) === "medium"
  ).length;

  const handleViewConflict = useCallback((conflict: ConflictResolution) => {
    setSelectedConflict(conflict);
    setDialogOpen(true);
  }, []);

  const handleResolveConflict = useCallback(
    (conflictId: string, resolution: "local" | "server" | "merge") => {
      onResolveConflict(conflictId, resolution);
      setDialogOpen(false);
      setSelectedConflict(null);
    },
    [onResolveConflict]
  );

  const handleResolveAll = useCallback(
    (resolution: "local" | "server") => {
      onResolveAll(resolution);
    },
    [onResolveAll]
  );

  if (conflicts.size === 0) return null;

  return (
    <>
      <Card elevation={3} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Badge badgeContent={conflicts.size} color="error">
              <WarningIcon color="warning" />
            </Badge>
            <Typography variant="h6">Data Conflicts Detected</Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {conflicts.size} conflict{conflicts.size > 1 ? "s" : ""} found.
              Your changes conflict with recent server updates.
            </Typography>
          </Alert>

          <Box display="flex" gap={1} mb={2}>
            {highPriorityConflicts > 0 && (
              <Chip
                label={`${highPriorityConflicts} High Priority`}
                color="error"
                size="small"
                variant="outlined"
              />
            )}
            {mediumPriorityConflicts > 0 && (
              <Chip
                label={`${mediumPriorityConflicts} Medium Priority`}
                color="warning"
                size="small"
                variant="outlined"
              />
            )}
            <Chip
              label={`${
                conflictsArray.length -
                highPriorityConflicts -
                mediumPriorityConflicts
              } Low Priority`}
              color="info"
              size="small"
              variant="outlined"
            />
          </Box>

          <List dense>
            {conflictsArray.slice(0, 3).map((conflict) => {
              const severity = getConflictSeverity(conflict);
              return (
                <ListItem
                  key={conflict.id}
                  secondaryAction={
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleViewConflict(conflict)}
                      startIcon={<CompareIcon />}
                    >
                      Review
                    </Button>
                  }
                >
                  <ListItemIcon>
                    <Chip
                      label={severity}
                      color={
                        severity === "high"
                          ? "error"
                          : severity === "medium"
                          ? "warning"
                          : "info"
                      }
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${
                      conflict.localChanges.length +
                      conflict.serverChanges.length
                    } changes in conflict`}
                    secondary={format(new Date(conflict.timestamp), "PPp")}
                  />
                </ListItem>
              );
            })}
            {conflictsArray.length > 3 && (
              <ListItem>
                <ListItemText
                  primary={`... and ${
                    conflictsArray.length - 3
                  } more conflicts`}
                  sx={{ fontStyle: "italic" }}
                />
              </ListItem>
            )}
          </List>
        </CardContent>

        <CardActions>
          <Button
            variant="outlined"
            onClick={() => handleResolveAll("server")}
            startIcon={<SyncIcon />}
            color="warning"
          >
            Use Server Data
          </Button>
          <Button
            variant="contained"
            onClick={() => handleResolveAll("local")}
            startIcon={<CheckCircleIcon />}
            color="primary"
          >
            Keep My Changes
          </Button>
        </CardActions>
      </Card>

      <ConflictResolutionDialog
        open={dialogOpen}
        conflict={selectedConflict}
        onResolve={handleResolveConflict}
        onClose={() => setDialogOpen(false)}
        shifts={shifts}
      />
    </>
  );
};

export default ConflictResolutionPanel;
