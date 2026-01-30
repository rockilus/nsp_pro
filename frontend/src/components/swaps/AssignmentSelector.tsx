"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Checkbox,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import dayjs from "dayjs";
import { AssignmentT, AssignmentDataDictT } from "../../types/assignment";
import { WorkerT } from "../../types/worker";
import { LinkShiftT } from "../../types/shift";
import { AssignmentApi } from "../../app/lib/api/assignmentApi";
import { LinkShiftApi } from "../../app/lib/api/linkShiftApi";
import { useApiClient } from "../../app/lib/api-client";

interface AssignmentSelectorProps {
  teamId: string;
  selectedAssignmentIds: string[];
  onSelectionChange: (assignmentIds: string[]) => void;
  workerId?: string; // Optional: filter by specific worker
  excludeAssignmentIds?: string[]; // Optional: exclude certain assignments
  minDate?: dayjs.Dayjs; // Optional: filter by date range
  maxDate?: dayjs.Dayjs;
  allowMultiple?: boolean; // Default true
}

interface GroupedAssignment {
  date: dayjs.Dayjs;
  assignments: AssignmentDataDictT[];
}

export default function AssignmentSelector({
  teamId,
  selectedAssignmentIds,
  onSelectionChange,
  workerId,
  excludeAssignmentIds = [],
  minDate,
  maxDate,
  allowMultiple = true,
}: AssignmentSelectorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const apiClient = useApiClient();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentDataDictT[]>([]);
  const [linkShifts, setLinkShifts] = useState<LinkShiftT[]>([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    workerId || "",
  );

  // Load assignments and link shifts
  useEffect(() => {
    const loadData = async () => {
      if (!teamId || !apiClient) {
        if (!teamId) {
          setError("Team ID is required");
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Determine date range (default to +/- 30 days from now)
        const start = minDate || dayjs().subtract(30, "day");
        const end = maxDate || dayjs().add(30, "day");

        // Fetch assignments and link shifts in parallel
        const [assignmentResult, linkShiftResult] = await Promise.all([
          AssignmentApi.getAssignments(
            apiClient,
            teamId,
            false,
            start,
            end,
            workerId,
          ),
          LinkShiftApi.getLinkShifts(apiClient, teamId),
        ]);

        // Extract assignments from result
        const allAssignments: AssignmentDataDictT[] =
          assignmentResult.assignmentsRead.map((assignment) => {
            // For simplification, create minimal AssignmentDataDictT structure
            // In production, you'd need to fetch full worker/shift data
            return {
              assignment,
              worker:
                workers.find((w) => w.id === assignment.workerId) ||
                ({} as WorkerT),
              shift: {} as any, // Would need to fetch shifts
              recurrence: null,
              breaches: [],
              requests: [],
            } as AssignmentDataDictT;
          });

        // Filter by worker if specified
        let filteredAssignments = allAssignments;
        if (selectedWorkerId) {
          filteredAssignments = allAssignments.filter(
            (a) => a.assignment.workerId === selectedWorkerId,
          );
        }

        // Exclude specified assignments
        if (excludeAssignmentIds.length > 0) {
          filteredAssignments = filteredAssignments.filter(
            (a) => !excludeAssignmentIds.includes(a.assignment.id),
          );
        }

        setAssignments(filteredAssignments);
        setLinkShifts(linkShiftResult);

        // Extract unique workers for filter
        const uniqueWorkers = Array.from(
          new Map(allAssignments.map((a) => [a.worker.id, a.worker])).values(),
        );
        setWorkers(uniqueWorkers);
      } catch (err) {
        console.error("Failed to load assignments:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load assignments",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    teamId,
    selectedWorkerId,
    minDate?.format("YYYY-MM-DD"),
    maxDate?.format("YYYY-MM-DD"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(excludeAssignmentIds),
  ]);

  // Group assignments by date
  const groupedAssignments = useMemo(() => {
    const groups: { [key: string]: AssignmentDataDictT[] } = {};
    assignments.forEach((a) => {
      const dateKey = a.assignment.date.format("YYYY-MM-DD");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(a);
    });

    // Convert to array and sort by date
    return Object.entries(groups)
      .map(([dateStr, assignments]) => ({
        date: dayjs(dateStr),
        assignments: assignments.sort((a, b) =>
          a.shift.startTime.isBefore(b.shift.startTime) ? -1 : 1,
        ),
      }))
      .sort((a, b) => (a.date.isBefore(b.date) ? -1 : 1));
  }, [assignments]);

  // Check if a shift is linked with others
  const getLinkedShiftIds = (shiftId: string): string[] => {
    const linkShift = linkShifts.find((ls) => ls.shiftIds.includes(shiftId));
    return linkShift ? linkShift.shiftIds : [];
  };

  // Handle selection toggle
  const handleToggle = (assignmentId: string) => {
    if (!allowMultiple) {
      onSelectionChange([assignmentId]);
      return;
    }

    const currentIndex = selectedAssignmentIds.indexOf(assignmentId);
    const newSelected = [...selectedAssignmentIds];

    if (currentIndex === -1) {
      newSelected.push(assignmentId);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    onSelectionChange(newSelected);
  };

  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  // Render empty state
  if (assignments.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No assignments found for the selected criteria.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Worker filter (only show if workerId prop not provided) */}
      {!workerId && workers.length > 1 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Filter by Worker</InputLabel>
          <Select
            value={selectedWorkerId}
            label="Filter by Worker"
            onChange={(e) => setSelectedWorkerId(e.target.value)}
          >
            <MenuItem value="">All Workers</MenuItem>
            {workers.map((worker) => (
              <MenuItem key={worker.id} value={worker.id}>
                {worker.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Assignment list */}
      {isMobile ? (
        // Mobile: List view
        <List>
          {groupedAssignments.map((group) => (
            <Box key={group.date.format("YYYY-MM-DD")} sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ px: 2, py: 1, bgcolor: "grey.100" }}
              >
                {group.date.format("ddd, MMM D, YYYY")}
              </Typography>
              {group.assignments.map((data) => {
                const isSelected = selectedAssignmentIds.includes(
                  data.assignment.id,
                );
                const linkedShiftIds = getLinkedShiftIds(data.shift.id);
                const isLinked = linkedShiftIds.length > 1;

                return (
                  <ListItem
                    key={data.assignment.id}
                    disablePadding
                    data-assignment-id={data.assignment.id}
                    data-testid={`assignment-${data.assignment.id}`}
                  >
                    <ListItemButton
                      onClick={() => handleToggle(data.assignment.id)}
                      dense
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={isSelected}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">
                              {data.shift.name}
                            </Typography>
                            {isLinked && (
                              <Chip
                                label="Linked"
                                size="small"
                                color="info"
                                sx={{ height: 20 }}
                              />
                            )}
                          </Box>
                        }
                        secondary={`${data.shift.startTime.format("HH:mm")} - ${data.shift.endTime.format("HH:mm")} • ${data.worker.name}`}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </Box>
          ))}
        </List>
      ) : (
        // Desktop: Table view
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">Select</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Worker</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedAssignments.map((group) =>
                group.assignments.map((data) => {
                  const isSelected = selectedAssignmentIds.includes(
                    data.assignment.id,
                  );
                  const linkedShiftIds = getLinkedShiftIds(data.shift.id);
                  const isLinked = linkedShiftIds.length > 1;

                  return (
                    <TableRow
                      key={data.assignment.id}
                      hover
                      onClick={() => handleToggle(data.assignment.id)}
                      sx={{ cursor: "pointer" }}
                      data-assignment-id={data.assignment.id}
                      data-testid={`assignment-${data.assignment.id}`}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={isSelected} />
                      </TableCell>
                      <TableCell>
                        {data.assignment.date.format("MMM D, YYYY")}
                      </TableCell>
                      <TableCell>{data.worker.name}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {data.shift.name}
                          {isLinked && (
                            <Chip label="Linked" size="small" color="info" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {data.shift.startTime.format("HH:mm")} -{" "}
                        {data.shift.endTime.format("HH:mm")}
                      </TableCell>
                      <TableCell>
                        {data.assignment.fixed && (
                          <Chip label="Fixed" size="small" color="warning" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Selection summary */}
      {selectedAssignmentIds.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {selectedAssignmentIds.length} assignment
            {selectedAssignmentIds.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
