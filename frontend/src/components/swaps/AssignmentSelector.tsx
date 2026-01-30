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
} from "@mui/material";
import dayjs from "dayjs";
import { AssignmentDataDictT } from "../../types/assignment";

interface AssignmentSelectorProps {
  selectedAssignmentIds: string[];
  onSelectionChange: (assignmentIds: string[]) => void;
  assignments: AssignmentDataDictT[];
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
