/**
 * ConfirmationDialog - Generic confirmation dialog component
 *
 * Reusable confirmation dialog with customizable content and actions.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Warning } from "@mui/icons-material";

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "text" | "outlined" | "contained";
  confirmColor?:
    | "primary"
    | "secondary"
    | "error"
    | "warning"
    | "info"
    | "success";
  showIcon?: boolean;
  testId?: string;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  content,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "contained",
  confirmColor = "primary",
  showIcon = false,
  testId = "confirmation-dialog",
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Confirmation action failed:", error);
      // Don't close dialog on error, let the parent handle it
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      data-testid={testId}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {showIcon && <Warning color="warning" />}
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography>{content}</Typography>
      </DialogContent>
      <DialogActions>
        <Button
          data-testid={`${testId}-cancel-button`}
          onClick={handleClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          data-testid={`${testId}-confirm-button`}
          onClick={handleConfirm}
          variant={confirmVariant}
          color={confirmColor}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
        >
          {isLoading ? "Processing..." : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
