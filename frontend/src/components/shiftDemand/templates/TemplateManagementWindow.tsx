/**
 * Template Management Window - Full-screen modal for managing shift demand templates
 *
 * This is a simplified placeholder implementation. Full functionality will be added in Phase 2.
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Button,
} from "@mui/material";
import { Close, Description } from "@mui/icons-material";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT } from "../../../types/shift";

interface TemplateManagementWindowProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  teamId: string;
  shifts: ShiftT[];
  currentPeriod: {
    start: any; // Dayjs
    end: any; // Dayjs
  };
}

export default function TemplateManagementWindow({
  lng,
  open,
  onClose,
  teamId,
  shifts,
  currentPeriod,
}: TemplateManagementWindowProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen
      PaperProps={{
        sx: {
          margin: 0,
          maxHeight: "100vh",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          zIndex: 1,
        }}
      >
        <Typography variant="h6" component="h2">
          {t("template_management")}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ color: "text.secondary" }}
          aria-label={t("close")}
        >
          <Close />
        </IconButton>
      </Box>

      {/* Main Content */}
      <DialogContent
        sx={{
          flex: 1,
          display: "flex",
          p: 4,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <Description sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" gutterBottom align="center">
          {t("template_management_coming_soon")}
        </Typography>
        <Typography
          variant="body1"
          color="textSecondary"
          align="center"
          sx={{ mb: 4, maxWidth: 600 }}
        >
          {t("template_management_description")}
        </Typography>
        <Button variant="contained" onClick={onClose}>
          {t("close")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
