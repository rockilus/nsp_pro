import React from "react";
import { Box, Typography, Button, IconButton, Chip } from "@mui/material";
import {
  Cancel as CancelIcon,
  CheckCircle as ConfirmIcon,
  Edit as EditIcon,
  Group as GroupIcon,
} from "@mui/icons-material";
import { MultitaskingSelectionProps } from "./types";
import { MultitaskingGroup } from "../../../types/multitasking";

export function MultitaskingSelectionSection({
  lng,
  selectedShiftDemandsCount,
  multitaskingGroups,
  onConfirmMultitasking,
  onEditMultitasking,
  onCancelMultitaskingMode,
}: MultitaskingSelectionProps) {
  const hasSelection = selectedShiftDemandsCount > 0;
  const hasGroups = multitaskingGroups.length > 0;

  return (
    <Box display="flex" alignItems="center" gap={2}>
      {/* Selection Status */}
      <Box display="flex" alignItems="center" gap={1}>
        <GroupIcon color="primary" fontSize="small" />
        <Typography variant="body2" color="text.secondary">
          {selectedShiftDemandsCount} shift demand
          {selectedShiftDemandsCount !== 1 ? "s" : ""} selected
        </Typography>
      </Box>
      {/* Multitasking Groups Summary */}{" "}
      {hasGroups && (
        <Box display="flex" alignItems="center" gap={1}>
          {multitaskingGroups.map((group: MultitaskingGroup, index: number) => (
            <Chip
              key={group.id}
              label={`Group ${index + 1} (${group.shiftDemandIds.length})`}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )}
      {/* Action Buttons */}
      <Box display="flex" alignItems="center" gap={1} ml="auto">
        {/* Edit button - only show if we have groups */}
        {hasGroups && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={onEditMultitasking}
            sx={{ minWidth: "auto" }}
          >
            Edit
          </Button>
        )}

        {/* Confirm button - only show if we have selection */}
        {hasSelection && (
          <Button
            variant="contained"
            size="small"
            startIcon={<ConfirmIcon />}
            onClick={onConfirmMultitasking}
            color="primary"
            sx={{ minWidth: "auto" }}
          >
            Confirm
          </Button>
        )}

        {/* Cancel button */}
        <IconButton
          size="small"
          onClick={onCancelMultitaskingMode}
          sx={{
            color: "text.secondary",
            "&:hover": { color: "error.main" },
          }}
        >
          <CancelIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
