/**
 * ConfirmEvenOddDialog - Confirmation dialog for converting templates to Even/Odd type
 *
 * Shows warning about week deletion when switching to EVEN_ODD template type
 * with more than 2 weeks
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { Warning, Delete } from "@mui/icons-material";
import { useTranslation } from "../../../../app/i18n/client";

interface ConfirmEvenOddDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  currentWeeks: number;
  weeksToDelete: number[];
  lng: string;
  templateName?: string;
}

export function ConfirmEvenOddDialog({
  open,
  onClose,
  onConfirm,
  currentWeeks,
  weeksToDelete,
  lng,
  templateName,
}: ConfirmEvenOddDialogProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to convert template type:", error);
      // Error handling is done in parent component
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    if (!isConfirming) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 300 },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Warning color="warning" />
        {t("confirm_even_odd_conversion")}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Main warning message */}
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {t("even_odd_conversion_warning")}
            </Typography>
          </Alert>

          {/* Template information */}
          {templateName && (
            <Box>
              <Typography variant="body2" color="textSecondary">
                {t("template")}: <strong>{templateName}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t("current_weeks")}: {currentWeeks}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t("target_weeks")}: 2
              </Typography>
            </Box>
          )}

          {/* List of weeks to be deleted */}
          {weeksToDelete.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("weeks_will_be_deleted")}
              </Typography>
              <List dense sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
                {weeksToDelete.map((weekNumber) => (
                  <ListItem key={weekNumber}>
                    <ListItemIcon>
                      <Delete color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${t("week")} ${weekNumber + 1}`}
                      secondary={t("week_delete_warning")}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Additional information */}
          <Box>
            <Typography variant="body2" color="textSecondary">
              {t("even_odd_template_explanation")}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isConfirming} color="inherit">
          {t("cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          color="warning"
          variant="contained"
          disabled={isConfirming}
          startIcon={
            isConfirming ? <CircularProgress size={16} /> : <Warning />
          }
        >
          {isConfirming ? t("converting") : t("convert_to_even_odd")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
