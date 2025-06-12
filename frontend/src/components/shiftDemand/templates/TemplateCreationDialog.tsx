/**
 * Template Creation Dialog - Choose how to create a new template
 *
 * This is a stub implementation that will be expanded in Phase 2
 */

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from "@mui/material";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT } from "../../../types/shift";
import { ShiftDemandTemplateT } from "../../../types/shift-demand-template";

interface TemplateCreationDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  teamId: string;
  shifts: ShiftT[];
  currentPeriod: {
    start: any; // Dayjs
    end: any; // Dayjs
  };
  onTemplateCreated: (template: ShiftDemandTemplateT) => void;
  onError: (error: string) => void;
}

export function TemplateCreationDialog({
  lng,
  open,
  onClose,
  teamId,
  shifts,
  currentPeriod,
  onTemplateCreated,
  onError,
}: TemplateCreationDialogProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t("create_new_template")}</DialogTitle>
      <DialogContent>
        <Typography
          variant="h6"
          color="textSecondary"
          align="center"
          sx={{ mt: 4 }}
        >
          {t("template_creation_coming_soon")}
        </Typography>
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mt: 2 }}
        >
          {t("template_creation_description")}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
