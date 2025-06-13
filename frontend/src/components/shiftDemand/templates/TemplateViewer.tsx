/**
 * Template Viewer Component - Display template details in read-only mode
 *
 * Shows:
 * - Template metadata (name, description, type, dates)
 * - Weekly demand grids for each week type
 * - Action buttons (edit, apply, delete)
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Edit,
  PlayArrow,
  Delete,
  ArrowBack,
  CalendarToday,
  Person,
  Info,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT } from "../../../types/shift";
import {
  ShiftDemandTemplateDTO,
  TemplateWeekDataDTO,
  DemandEntryDTO,
  TemplateType,
} from "../../../types/shift-demand-template";
import {
  ShiftDemandTemplateApi,
  TemplateUtils,
} from "../../../app/lib/api/shiftDemandTemplateApi";

interface TemplateViewerProps {
  lng: string;
  template: ShiftDemandTemplateDTO;
  shifts: ShiftT[];
  onEdit: () => void;
  onApply: () => void;
  onDelete: () => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export function TemplateViewer({
  lng,
  template,
  shifts,
  onEdit,
  onApply,
  onDelete,
  onBack,
  onError,
}: TemplateViewerProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Get day names for headers
  const dayNames = [
    t("monday_short"),
    t("tuesday_short"),
    t("wednesday_short"),
    t("thursday_short"),
    t("friday_short"),
    t("saturday_short"),
    t("sunday_short"),
  ];

  // Create shifts map for quick lookup
  const shiftsMap = new Map(shifts.map((shift) => [shift.id, shift]));

  const handleDelete = async () => {
    if (
      !window.confirm(t("confirm_delete_template", { name: template.name }))
    ) {
      return;
    }

    setDeleteLoading(true);
    try {
      await ShiftDemandTemplateApi.deleteTemplate(template.id, template.teamId);
      onDelete();
    } catch (error) {
      console.error("Failed to delete template:", error);
      onError(
        error instanceof Error ? error.message : "Failed to delete template"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatTemplateType = (type: TemplateType) => {
    return TemplateUtils.formatTemplateType(type);
  };

  const formatDate = (timestamp: number) => {
    return dayjs(timestamp * 1000).format("MMMM D, YYYY [at] h:mm A");
  };

  // Render a week data grid
  const renderWeekGrid = (demands: DemandEntryDTO[], title: string) => {
    // Group demands by shift
    const demandsByShift = demands.reduce((acc, demand) => {
      if (!acc[demand.shiftId]) {
        acc[demand.shiftId] = new Array(7).fill(0);
      }
      acc[demand.shiftId][demand.dayOfWeek] = demand.count;
      return acc;
    }, {} as Record<string, number[]>);

    // Get unique shifts that have demands
    const shiftsWithDemands = Object.keys(demandsByShift)
      .map((shiftId) => shiftsMap.get(shiftId))
      .filter(Boolean) as ShiftT[];

    if (shiftsWithDemands.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("no_demands_for_week", { week: title })}
        </Alert>
      );
    }

    return (
      <Box className="template-week-grid">
        {/* Header row */}
        <Box className="template-week-grid-header">{t("shift")}</Box>
        {dayNames.map((dayName) => (
          <Box key={dayName} className="template-week-grid-header">
            {dayName}
          </Box>
        ))}

        {/* Data rows */}
        {shiftsWithDemands.map((shift) => {
          const shiftDemands = demandsByShift[shift.id];
          return (
            <React.Fragment key={shift.id}>
              <Box className="template-week-grid-cell">
                <Typography variant="body2" fontWeight={500}>
                  {shift.name}
                </Typography>
              </Box>
              {shiftDemands.map((count, dayIndex) => (
                <Box
                  key={dayIndex}
                  className={`template-week-grid-cell ${
                    count > 0 ? "has-demand" : "empty"
                  }`}
                >
                  {count > 0 ? count : "—"}
                </Box>
              ))}
            </React.Fragment>
          );
        })}
      </Box>
    );
  };

  return (
    <Box className="template-viewer-container">
      {/* Header */}
      <Box className="template-viewer-header">
        <Box className="template-viewer-title">
          <IconButton onClick={onBack} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              {template.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Chip
                label={formatTemplateType(template.templateType)}
                color="primary"
                variant="outlined"
                size="small"
              />
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <CalendarToday fontSize="small" />
                {t("created")} {formatDate(template.createdAt)}
              </Typography>
            </Box>
            {template.description && (
              <Typography variant="body1" color="textSecondary">
                {template.description}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Action buttons */}
        <Box className="template-viewer-actions">
          <Button variant="outlined" startIcon={<Edit />} onClick={onEdit}>
            {t("edit")}
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={onApply}
            color="primary"
          >
            {t("apply_template")}
          </Button>
          <Button
            variant="outlined"
            startIcon={
              deleteLoading ? <CircularProgress size={16} /> : <Delete />
            }
            onClick={handleDelete}
            disabled={deleteLoading}
            color="error"
          >
            {t("delete")}
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box className="template-viewer-content">
        {/* Template Info */}
        <Box className="template-viewer-section">
          <Typography className="template-viewer-section-title">
            {t("template_information")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="body2" color="textSecondary">
                {t("template_type")}
              </Typography>
              <Typography variant="body1">
                {formatTemplateType(template.templateType)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                {t("total_demands")}
              </Typography>
              <Typography variant="body1">
                {TemplateUtils.calculateTotalDemands(template)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                {t("created_by")}
              </Typography>
              <Typography variant="body1">{template.createdBy}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                {t("last_updated")}
              </Typography>
              <Typography variant="body1">
                {formatDate(template.updatedAt)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Week Data */}
        {template.weeksData.map((weekData, index) => (
          <React.Fragment key={weekData.weekNumber}>
            <Box className="template-viewer-section">
              <Typography className="template-viewer-section-title">
                {template.templateType === "standard"
                  ? t("weekly_demands")
                  : index === 0
                  ? t("even_week_demands")
                  : t("odd_week_demands")}
              </Typography>
              {renderWeekGrid(weekData.demands, `Week ${weekData.weekNumber}`)}
            </Box>
            {index < template.weeksData.length - 1 && (
              <Divider sx={{ my: 3 }} />
            )}
          </React.Fragment>
        ))}

        {/* Usage Information */}
        <Divider sx={{ my: 3 }} />

        <Box className="template-viewer-section">
          <Typography className="template-viewer-section-title">
            {t("usage_information")}
          </Typography>
          <Alert severity="info" icon={<Info />}>
            <Typography variant="body2">
              {template.templateType === "standard"
                ? t("standard_template_usage_info")
                : t("even_odd_template_usage_info")}
            </Typography>
          </Alert>
        </Box>
      </Box>
    </Box>
  );
}
