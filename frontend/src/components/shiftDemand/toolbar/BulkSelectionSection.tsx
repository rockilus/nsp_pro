import React, { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "../../../app/i18n/client";
import { BulkSelectionProps } from "./types";

export function BulkSelectionSection({
  lng,
  selectedCellsCount,
  bulkValue,
  onBulkValueChange,
  onApplyBulkChange,
  onDeleteBulkSelection,
  onCancelBulkMode,
}: BulkSelectionProps) {
  const { t } = useTranslation(lng, "shift-demands");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasSelection = selectedCellsCount > 0;

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDeleteBulkSelection();
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && hasSelection && bulkValue) {
      onApplyBulkChange();
    } else if (event.key === "Escape") {
      onCancelBulkMode();
    }
  };

  return (
    <>
      <Box display="flex" alignItems="center" gap={2}>
        {/* Selection status and input */}
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" fontWeight="medium">
            {t("selection")}:
          </Typography>

          <TextField
            data-testid="bulk-selection-input"
            type="number"
            value={bulkValue}
            onChange={(e) => onBulkValueChange(e.target.value)}
            size="small"
            disabled={!hasSelection}
            inputProps={{
              min: 0,
              style: { textAlign: "center" },
            }}
            placeholder={t("shift_demands")}
            onKeyDown={handleKeyPress}
            sx={{ width: 80 }}
          />
        </Box>

        {/* Action buttons */}
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton
            data-testid="bulk-selection-delete-button"
            size="small"
            color="error"
            onClick={handleDeleteClick}
            disabled={!hasSelection}
            title={t("delete")}
            sx={{
              border: 1,
              borderColor: "divider",
              "&:hover": { borderColor: "error.main" },
              "&.Mui-disabled": { borderColor: "action.disabled" },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>

          <IconButton
            data-testid="bulk-selection-confirm-button"
            size="small"
            onClick={onApplyBulkChange}
            disabled={!hasSelection || !bulkValue}
            title={t("save")}
            sx={{
              border: 1,
              borderColor: "divider",
              "&:hover": { borderColor: "primary.main" },
              "&.Mui-disabled": { borderColor: "action.disabled" },
            }}
          >
            <CheckIcon fontSize="small" />
          </IconButton>

          <IconButton
            data-testid="bulk-selection-cancel-button"
            size="small"
            onClick={onCancelBulkMode}
            title={t("cancel")}
            sx={{
              ml: 1, // Add slight space before cancel button
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          {t("confirm_delete")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("delete_selection_confirmation", { count: selectedCellsCount })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            {t("cancel")}
          </Button>
          <Button
            data-testid="bulk-selection-delete-confirm-button"
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            autoFocus
          >
            {t("delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
