"use client";

import React, { useMemo } from "react";
import {
  Box,
  Checkbox,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  useTheme,
  useMediaQuery,
  Button,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import { AssignmentDataDictT } from "../../types/assignment";
import { LinkShiftT } from "../../types/shift";

interface AssignmentSelectorProps {
  selectedAssignmentIds: string[];
  onSelectionChange: (assignmentIds: string[]) => void;
  assignments: AssignmentDataDictT[];
  linkShifts: LinkShiftT[];
  allowMultiple?: boolean; // Default true
}

interface GroupedAssignment {
  date: dayjs.Dayjs;
  assignments: AssignmentDataDictT[];
}

export default function AssignmentSelector({
  selectedAssignmentIds,
  onSelectionChange,
  assignments,
  linkShifts,
  allowMultiple = true,
}: AssignmentSelectorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
        assignments: assignments.sort((a, b) => {
          if (!a.shift?.startTime || !b.shift?.startTime) return 0;
          return a.shift.startTime.isBefore(b.shift.startTime) ? -1 : 1;
        }),
      }))
      .sort((a, b) => (a.date.isBefore(b.date) ? -1 : 1));
  }, [assignments]);

  // Find suggested linked shift assignments
  const suggestedLinkedAssignments = useMemo(() => {
    const suggested: AssignmentDataDictT[] = [];
    const selectedSet = new Set(selectedAssignmentIds);

    // Get selected assignments
    const selectedAssignments = assignments.filter((a) =>
      selectedSet.has(a.assignment.id),
    );

    // For each selected assignment, check if it has linked shifts
    selectedAssignments.forEach((selectedAssignment) => {
      const shiftId = selectedAssignment.assignment.shiftId;
      const workerId = selectedAssignment.assignment.workerId;
      const date = selectedAssignment.assignment.date;

      // Find linked shifts
      const linkShift = linkShifts.find((ls) => ls.shiftIds.includes(shiftId));
      if (!linkShift) return;

      // Get other shift IDs in the link
      const linkedShiftIds = linkShift.shiftIds.filter((id) => id !== shiftId);

      // Find assignments for the same worker on the same date with linked shifts
      linkedShiftIds.forEach((linkedShiftId) => {
        const linkedAssignment = assignments.find(
          (a) =>
            a.assignment.workerId === workerId &&
            a.assignment.date.format("YYYY-MM-DD") ===
              date.format("YYYY-MM-DD") &&
            a.assignment.shiftId === linkedShiftId &&
            !selectedSet.has(a.assignment.id),
        );

        if (linkedAssignment && !suggested.includes(linkedAssignment)) {
          suggested.push(linkedAssignment);
        }
      });
    });

    return suggested;
  }, [assignments, selectedAssignmentIds, linkShifts]);

  // Handle adding all suggested assignments
  const handleAddSuggested = () => {
    const newIds = suggestedLinkedAssignments.map((a) => a.assignment.id);
    onSelectionChange([...selectedAssignmentIds, ...newIds]);
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

                return (
                  <ListItem
                    key={data.assignment.id}
                    disablePadding
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
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedAssignments.map((group) =>
                group.assignments.map((data) => {
                  const isSelected = selectedAssignmentIds.includes(
                    data.assignment.id,
                  );

                  return (
                    <TableRow
                      key={data.assignment.id}
                      hover
                      onClick={() => handleToggle(data.assignment.id)}
                      sx={{ cursor: "pointer" }}
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
                        </Box>
                      </TableCell>
                      <TableCell>
                        {data.shift.startTime.format("HH:mm")} -{" "}
                        {data.shift.endTime.format("HH:mm")}
                      </TableCell>
                    </TableRow>
                  );
                }),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Linked shift suggestions */}
      {suggestedLinkedAssignments.length > 0 && (
        <Alert
          severity="info"
          sx={{ mt: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddSuggested}
            >
              Add All
            </Button>
          }
        >
          <Typography variant="body2" fontWeight="medium" gutterBottom>
            Linked shift assignments available
          </Typography>
          <Typography variant="body2">
            Consider adding {suggestedLinkedAssignments.length} linked shift
            assignment{suggestedLinkedAssignments.length !== 1 ? "s" : ""} to
            keep shifts together:
          </Typography>
          <Box sx={{ mt: 1 }}>
            {suggestedLinkedAssignments.map((data) => (
              <Chip
                key={data.assignment.id}
                label={`${data.shift.name} on ${data.assignment.date.format("MMM D")}`}
                size="small"
                sx={{ mr: 0.5, mt: 0.5 }}
              />
            ))}
          </Box>
        </Alert>
      )}
    </Box>
  );
}
