import React, { useState } from "react";
import { Box, Typography, Button, IconButton, Chip } from "@mui/material";
import {
  Cancel as CancelIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  List as ListIcon,
} from "@mui/icons-material";
import { MultitaskingSelectionProps } from "./types";
import { MultitaskingGroup } from "../../../types/multitasking";
import { MultitaskingGroupsDialog } from "./MultitaskingGroupsDialog";

export function MultitaskingSelectionSection({
  lng,
  selectedShiftDemandsCount,
  multitaskingGroups,
  onConfirmMultitasking,
  onEditMultitasking,
  onCancelMultitaskingMode,
  onDeleteGroup,
}: MultitaskingSelectionProps) {
  const [groupsDialogOpen, setGroupsDialogOpen] = useState(false);
  const hasSelection = selectedShiftDemandsCount > 0;
  const hasGroups = multitaskingGroups.length > 0;

  return (
    <Box display="flex" alignItems="center" gap={2}>
      {/* Action Buttons */}
      <Box display="flex" alignItems="center" gap={1} ml="auto">
        {/* List Groups Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<ListIcon />}
          onClick={() => setGroupsDialogOpen(true)}
          disabled={!hasGroups}
          sx={{ minWidth: "auto" }}
        >
          Groups ({multitaskingGroups.length})
        </Button>

        {/* Create button (renamed from Confirm) - only show if we have selection */}
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onConfirmMultitasking}
          color="primary"
          disabled={selectedShiftDemandsCount < 2}
          sx={{ minWidth: "auto" }}
        >
          Create
        </Button>

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
      {/* Groups Dialog */}
      <MultitaskingGroupsDialog
        open={groupsDialogOpen}
        onClose={() => setGroupsDialogOpen(false)}
        groups={multitaskingGroups}
        lng={lng}
        onDeleteGroup={async (groupId: string) => {
          if (onDeleteGroup) {
            await onDeleteGroup(groupId);
          } else {
            console.log("Delete group:", groupId);
          }
          setGroupsDialogOpen(false);
        }}
      />
    </Box>
  );
}
