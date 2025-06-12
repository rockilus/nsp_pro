/**
 * Template Editor Component - Create and edit templates
 *
 * This is a stub implementation that will be expanded in Phase 2
 */

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { ArrowBack, Save, Cancel } from "@mui/icons-material";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT } from "../../../types/shift";
import { ShiftDemandTemplateT } from "../../../types/shift-demand-template";

interface TemplateEditorProps {
  lng: string;
  template: ShiftDemandTemplateT | null; // null for create mode
  shifts: ShiftT[];
  onSave: (template: ShiftDemandTemplateT) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function TemplateEditor({
  lng,
  template,
  shifts,
  onSave,
  onCancel,
  onError,
}: TemplateEditorProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const isEditMode = template !== null;

  return (
    <Box className="template-editor-container">
      {/* Header */}
      <Box className="template-editor-header">
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={onCancel}
            variant="outlined"
          >
            {t("back")}
          </Button>
          <Typography variant="h5" component="h2">
            {isEditMode ? t("edit_template") : t("create_template")}
          </Typography>
        </Box>

        <Box className="template-editor-actions">
          <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={() => {
              // TODO: Implement save logic
              onError("Template editor not yet implemented");
            }}
          >
            {t("save")}
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box className="template-editor-content">
        <Typography
          variant="h6"
          color="textSecondary"
          align="center"
          sx={{ mt: 4 }}
        >
          {t("template_editor_coming_soon")}
        </Typography>
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mt: 2 }}
        >
          {t("template_editor_description")}
        </Typography>
      </Box>
    </Box>
  );
}
