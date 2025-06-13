/**
 * Build From Demands Dialog - Placeholder for building templates from existing shift demands
 *
 * This is a placeholder component that will be implemented in the future.
 * It will allow users to create or update templates based on existing shift demand data.
 */

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from "@mui/material";
import { Build, Info } from "@mui/icons-material";
import { useTranslation } from "../../../../app/i18n/client";

interface BuildFromDemandsDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  templateName: string;
}

export function BuildFromDemandsDialog({
  lng,
  open,
  onClose,
  templateName,
}: BuildFromDemandsDialogProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Build color="primary" />
        {t("build_from_demands")}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
            {t("build_from_demands_placeholder_info")}
          </Alert>

          <Typography variant="h6" gutterBottom>
            {t("planned_features")}:
          </Typography>

          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              {t("select_date_range_feature")}
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              {t("preview_existing_demands_feature")}
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              {t("select_shifts_to_include_feature")}
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              {t("choose_template_type_feature")}
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              {t("update_template_with_demands_feature", {
                name: templateName,
              })}
            </Typography>
          </Box>

          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            {t("build_from_demands_placeholder_description")}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
        <Button variant="contained" disabled>
          {t("coming_soon")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
