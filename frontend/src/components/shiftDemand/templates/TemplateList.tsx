/**
 * Template List Component - Sidebar list of all templates
 *
 * Displays templates in a scrollable list with:
 * - Template name, type, and description
 * - Creation date and stats
 * - Quick action buttons (apply, delete)
 * - Create new template button
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Add,
  PlayArrow,
  Delete,
  Description,
  DateRange,
  Person,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
import {
  TemplateListItem,
  TemplateType,
} from "../../../types/shift-demand-template";
import { TemplateUtils } from "../../../app/lib/api/shiftDemandTemplateApi";

interface TemplateListProps {
  lng: string;
  teamId: string;
  templates: TemplateListItem[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: TemplateListItem) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: (templateId: string) => void;
  onError: (error: string) => void;
  onTemplatesLoaded: (templates: TemplateListItem[]) => void;
  onLoadTemplates: () => Promise<void>;
  onDeleteTemplateRequest: (
    templateId: string,
    templateName: string
  ) => Promise<void>;
}

export function TemplateList({
  lng,
  teamId,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  onError,
  onTemplatesLoaded,
  onLoadTemplates,
  onDeleteTemplateRequest,
}: TemplateListProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const [isLoading, setIsLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    console.log("🔄 Loading templates for team:", teamId);

    onLoadTemplates();
  }, [teamId, onLoadTemplates]);

  const handleDeleteTemplate = async (
    templateId: string,
    templateName: string
  ) => {
    if (!window.confirm(t("confirm_delete_template", { name: templateName }))) {
      return;
    }

    setDeleteLoading(templateId);
    try {
      await onDeleteTemplateRequest(templateId, templateName);
    } catch (error) {
      console.error("Failed to delete template:", error);
      onError(
        error instanceof Error ? error.message : "Failed to delete template"
      );
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatTemplateType = (type: TemplateType) => {
    return TemplateUtils.formatTemplateType(type);
  };

  const formatDate = (date: dayjs.Dayjs) => {
    return date.format("MMM D, YYYY");
  };

  if (isLoading) {
    return (
      <Box className="template-loading">
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          {t("loading_templates")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="template-list-container">
      {/* Header */}
      <Box className="template-list-header">
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onCreateTemplate}
          className="template-list-create-button"
          fullWidth
        >
          {t("create_template")}
        </Button>
      </Box>

      {/* Template List */}
      <Box className="template-list-content">
        {templates.length === 0 ? (
          <Box className="template-list-empty">
            <Description className="template-list-empty-icon" />
            <Typography variant="h6" gutterBottom>
              {t("no_templates")}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t("no_templates_description")}
            </Typography>
          </Box>
        ) : (
          templates.map((template) => (
            <Box
              key={template.id}
              className={`template-list-item ${
                selectedTemplateId === template.id ? "selected" : ""
              }`}
              onClick={() => onSelectTemplate(template)}
            >
              <Box className="template-list-item-content">
                {/* Header with name and actions */}
                <Box className="template-list-item-header">
                  <Typography
                    variant="subtitle1"
                    className="template-list-item-name"
                    title={template.name}
                  >
                    {template.name}
                  </Typography>
                  <Box className="template-list-item-actions">
                    <Tooltip title={t("apply_template")}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement quick apply
                          onSelectTemplate(template);
                        }}
                      >
                        <PlayArrow fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("delete_template")}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id, template.name);
                        }}
                        disabled={deleteLoading === template.id}
                      >
                        {deleteLoading === template.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Delete fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Metadata */}
                <Box className="template-list-item-meta">
                  {/* Template type */}
                  <Chip
                    label={formatTemplateType(template.templateType)}
                    size="small"
                    className={`template-list-item-type ${template.templateType.replace(
                      "_",
                      "-"
                    )}`}
                  />

                  {/* Stats */}
                  <Box className="template-list-item-stats">
                    <Typography variant="caption">
                      {t("total_demands", { count: template.totalDemands })}
                    </Typography>
                    <Typography variant="caption">
                      {formatDate(template.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {/* Description */}
                {template.description && (
                  <Typography
                    variant="body2"
                    className="template-list-item-description"
                    title={template.description}
                  >
                    {template.description}
                  </Typography>
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
