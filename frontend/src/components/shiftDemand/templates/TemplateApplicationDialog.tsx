/**
 * Template Application Dialog - Apply template to a date range
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

interface TemplateApplicationDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  templateId: string | null;
  currentPeriod: {
    start: any; // Dayjs
    end: any; // Dayjs
  };
  onApplicationComplete: () => void;
  onError: (error: string) => void;
}

export function TemplateApplicationDialog({
  lng,
  open,
  onClose,
  templateId,
  currentPeriod,
  onApplicationComplete,
  onError,
}: TemplateApplicationDialogProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t("apply_template")}</DialogTitle>
      <DialogContent>
        <Typography
          variant="h6"
          color="textSecondary"
          align="center"
          sx={{ mt: 4 }}
        >
          {t("template_application_coming_soon")}
        </Typography>
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mt: 2 }}
        >
          {t("template_application_description")}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
