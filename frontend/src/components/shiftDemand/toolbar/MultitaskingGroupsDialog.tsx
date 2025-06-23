import React, { useState } from "react";
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
} from "@mui/icons-material";
import { MultitaskingGroup } from "../../../types/multitasking";

interface ParsedRelatedId {
  shiftId: string;
  date: string; // YYYY-MM-DD format
}

interface MultitaskingGroupsDialogProps {
  open: boolean;
  onClose: () => void;
  groups: MultitaskingGroup[];
  lng: string;
  onDeleteGroup: (groupId: string) => Promise<void>;
}

// Utility function to parse related IDs
function parseRelatedId(relatedId: string): ParsedRelatedId | null {
  const parts = relatedId.split("-");
  if (parts.length < 4) return null; // shiftId-YYYY-MM-DD minimum

  const date = parts.slice(-3).join("-"); // Last 3 parts are YYYY-MM-DD
  const shiftId = parts.slice(0, -3).join("-"); // Everything before date

  return { shiftId, date };
}

// Process groups to extract shift and date information
function processMultitaskingGroup(group: MultitaskingGroup) {
  const parsedRelatedIds = group.relatedIds
    .map(parseRelatedId)
    .filter(Boolean) as ParsedRelatedId[];

  const uniqueDates = [...new Set(parsedRelatedIds.map((p) => p.date))].sort();
  const uniqueShiftIds = [...new Set(parsedRelatedIds.map((p) => p.shiftId))];

  return {
    ...group,
    parsedRelatedIds,
    uniqueDates,
    uniqueShiftIds,
  };
}

function MultitaskingGroupItem({
  group,
  index,
  onDelete,
  isDeleting = false,
}: {
  group: MultitaskingGroup;
  index: number;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const processedGroup = processMultitaskingGroup(group);

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

      {/* Group Details */}
      <Box mt={1}>
        {/* Dates */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <DateIcon fontSize="small" color="primary" />
          <Typography variant="body2" color="text.secondary">
            Dates:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {processedGroup.uniqueDates.map((date) => (
              <Chip
                key={date}
                label={new Date(date).toLocaleDateString()}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>

        {/* Shifts */}
        <Box display="flex" alignItems="center" gap={1}>
          <ShiftIcon fontSize="small" color="primary" />
          <Typography variant="body2" color="text.secondary">
            Shifts:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {processedGroup.uniqueShiftIds.map((shiftId) => (
              <Chip
                key={shiftId}
                label={shiftId.substring(0, 8) + "..."} // Show first 8 chars + ellipsis
                size="small"
                variant="outlined"
                title={shiftId} // Full ID on hover
              />
            ))}
          </Box>
        </Box>

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
