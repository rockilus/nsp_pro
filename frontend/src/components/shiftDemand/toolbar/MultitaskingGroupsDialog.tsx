import React, { useState } from "react";
import dayjs from "dayjs";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  CalendarToday as DateIcon,
  Work as ShiftIcon,
  Schedule as TimeIcon,
} from "@mui/icons-material";
import { MultitaskingGroup } from "../../../types/multitasking";
import { ShiftT } from "../../../types/shift";

interface ParsedRelatedId {
  shiftId: string;
  date: string; // YYYY-MM-DD format
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  endsNextDay?: boolean;
}

interface MultitaskingGroupsDialogProps {
  open: boolean;
  onClose: () => void;
  groups: MultitaskingGroup[];
  shifts: ShiftT[];
  lng: string;
  onDeleteGroup: (groupId: string) => Promise<void>;
}

// Utility function to format time from dayjs to display format
function formatTime(time: dayjs.Dayjs): string {
  return time.format("h:mm A");
}

// Check if shift ends the next day
function isNextDay(startTime: dayjs.Dayjs, endTime: dayjs.Dayjs): boolean {
  return endTime.isBefore(startTime) || endTime.hour() < startTime.hour();
}

// Utility function to parse related IDs with shift data
function parseRelatedIdWithShiftData(
  relatedId: string,
  shifts: ShiftT[],
): ParsedRelatedId | null {
  const parts = relatedId.split("-");
  if (parts.length < 4) return null; // shiftId-YYYY-MM-DD minimum

  const date = parts.slice(-3).join("-"); // Last 3 parts are YYYY-MM-DD
  const shiftId = parts.slice(0, -3).join("-"); // Everything before date

  // Find shift details
  const shift = shifts.find((s) => s.id === shiftId);

  return {
    shiftId,
    date,
    shiftName: shift?.name || "Unknown Shift",
    startTime: shift ? formatTime(shift.startTime) : undefined,
    endTime: shift ? formatTime(shift.endTime) : undefined,
    endsNextDay: shift ? isNextDay(shift.startTime, shift.endTime) : false,
  };
}

// Process groups to extract shift and date information with shift details
function processMultitaskingGroup(group: MultitaskingGroup, shifts: ShiftT[]) {
  const parsedRelatedIds = group.relatedIds
    .map((relatedId) => parseRelatedIdWithShiftData(relatedId, shifts))
    .filter(Boolean) as ParsedRelatedId[];

  return {
    ...group,
    parsedRelatedIds,
  };
}

function MultitaskingGroupItem({
  group,
  index,
  onDelete,
  isDeleting = false,
  shifts,
}: {
  group: MultitaskingGroup;
  index: number;
  onDelete: () => void;
  isDeleting?: boolean;
  shifts: ShiftT[];
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const processedGroup = processMultitaskingGroup(group, shifts);

  return (
    <ListItem
      sx={{
        flexDirection: "column",
        alignItems: "stretch",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        mb: 1,
        bgcolor: "background.paper",
      }}
    >
      {/* Group Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
      >
        <Typography variant="subtitle2" fontWeight="bold">
          Group {index + 1}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            size="small"
            label={`${group.relatedIds.length} demands`}
            color="primary"
            variant="outlined"
          />
          {!deleteConfirm ? (
            <IconButton
              size="small"
              onClick={() => setDeleteConfirm(true)}
              color="error"
              disabled={isDeleting}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          ) : (
            <Box display="flex" gap={0.5}>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={onDelete}
                disabled={isDeleting}
                sx={{ minWidth: "auto", px: 1 }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDeleteConfirm(false)}
                sx={{ minWidth: "auto", px: 1 }}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Shift Details List */}
      <Box mt={1} width="100%">
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Shift Demands:
        </Typography>

        <List
          dense
          sx={{
            borderRadius: 1,
            py: 0,
          }}
        >
          {processedGroup.parsedRelatedIds.map((item, idx) => (
            <ListItem
              key={`${item.shiftId}-${item.date}-${idx}`}
              sx={{ py: 0.5 }}
            >
              <ListItemText
                primary={
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
                    {/* Date */}
                    <Chip
                      size="small"
                      icon={<DateIcon fontSize="small" />}
                      label={new Date(item.date).toLocaleDateString()}
                      variant="outlined"
                      color="primary"
                    />

                    {/* Shift Name */}
                    <Chip
                      size="small"
                      icon={<ShiftIcon fontSize="small" />}
                      label={item.shiftName}
                      variant="outlined"
                      color="secondary"
                    />

                    {/* Time Range */}
                    {item.startTime && item.endTime && (
                      <Chip
                        size="small"
                        icon={<TimeIcon fontSize="small" />}
                        label={`${item.startTime} - ${item.endTime}${
                          item.endsNextDay ? " +1" : ""
                        }`}
                        variant="outlined"
                        sx={{
                          bgcolor: item.endsNextDay
                            ? "warning.light"
                            : "transparent",
                          color: item.endsNextDay
                            ? "warning.contrastText"
                            : "inherit",
                          "& .MuiChip-icon": {
                            color: item.endsNextDay
                              ? "warning.contrastText"
                              : "inherit",
                          },
                        }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  item.endsNextDay ? (
                    <Typography variant="caption" color="warning.main">
                      Shift ends next day
                    </Typography>
                  ) : null
                }
              />
            </ListItem>
          ))}
        </List>

        {/* Notes if available */}
        {group.notes && (
          <Box mt={1}>
            <Typography variant="body2" color="text.secondary">
              Notes: {group.notes}
            </Typography>
          </Box>
        )}
      </Box>
    </ListItem>
  );
}

export function MultitaskingGroupsDialog({
  open,
  onClose,
  groups,
  shifts,
  lng,
  onDeleteGroup,
}: MultitaskingGroupsDialogProps) {
  const hasGroups = groups.length > 0;
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const handleDeleteGroup = async (groupId: string) => {
    setDeletingGroupId(groupId);
    try {
      await onDeleteGroup(groupId);
    } finally {
      setDeletingGroupId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "400px" },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Multitasking Groups</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {!hasGroups ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No multitasking groups have been created yet. Select shift demands
            and click &quot;Create&quot; to make your first group.
          </Alert>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {groups.length} group{groups.length !== 1 ? "s" : ""} created
            </Typography>
            <List sx={{ mt: 2 }}>
              {groups.map((group, index) => (
                <MultitaskingGroupItem
                  key={group.id || index}
                  group={group}
                  index={index}
                  shifts={shifts}
                  onDelete={() => handleDeleteGroup(group.id!)}
                  isDeleting={deletingGroupId === group.id}
                />
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
