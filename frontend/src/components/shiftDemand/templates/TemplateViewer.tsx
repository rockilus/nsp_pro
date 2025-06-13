/**
 * Template Viewer Component - Display template details in read-only mode
 *
 * Shows:
 * - Template metadata (name, description, type, dates)
 * - Weekly demand grids for each week type
 * - Action buttons (edit, apply, delete)
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import {
  Edit,
  PlayArrow,
  Delete,
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
  TEMPLATE_CONSTRAINTS,
} from "../../../types/shift-demand-template";
import {
  ShiftDemandTemplateApi,
  TemplateUtils,
} from "../../../app/lib/api/shiftDemandTemplateApi";
import { TemplateToolbar } from "./TemplateToolbar";
import { BuildFromDemandsDialog } from "./dialogs/BuildFromDemandsDialog";

interface TemplateViewerProps {
  lng: string;
  template: ShiftDemandTemplateDTO;
  shifts: ShiftT[];
  onApply: () => void;
  onDelete: () => void;
  onError: (error: string) => void;
}

export function TemplateViewer({
  lng,
  template,
  shifts,
  onApply,
  onDelete,
  onError,
}: TemplateViewerProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toolbar state
  const [currentWeek, setCurrentWeek] = useState(0);
  const [weeksToShow, setWeeksToShow] = useState<1 | 2 | "all">(1);
  const [templateType, setTemplateType] = useState<TemplateType>(
    template.templateType as TemplateType
  );
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);

  // Edit dialogs state
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editDescriptionOpen, setEditDescriptionOpen] = useState(false);
  const [editedName, setEditedName] = useState(template.name);
  const [editedDescription, setEditedDescription] = useState(
    template.description || ""
  );
  const [saveLoading, setSaveLoading] = useState(false);

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

  // Compute derived values for toolbar
  const totalWeeks = template.weeksData.length;
  const displayedWeeks = useMemo(() => {
    if (weeksToShow === "all") {
      return template.weeksData.map((w) => w.weekNumber);
    }
    if (weeksToShow === 2) {
      const secondWeek = Math.min(currentWeek + 1, totalWeeks - 1);
      return currentWeek === secondWeek
        ? [currentWeek]
        : [currentWeek, secondWeek];
    }
    return [currentWeek];
  }, [currentWeek, weeksToShow, template.weeksData, totalWeeks]);

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

  const handleEditName = () => {
    setEditedName(template.name);
    setEditNameOpen(true);
  };

  const handleEditDescription = () => {
    setEditedDescription(template.description || "");
    setEditDescriptionOpen(true);
  };

  const handleSaveName = async () => {
    const trimmedName = editedName.trim();

    if (
      trimmedName === "" ||
      trimmedName.length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH
    ) {
      setEditNameOpen(false);
      return;
    }

    if (trimmedName === template.name) {
      setEditNameOpen(false);
      return;
    }

    setSaveLoading(true);
    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        {
          name: trimmedName,
        }
      );
      setEditNameOpen(false);
    } catch (error) {
      console.error("Failed to update template name:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Failed to update template name"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    if (editedDescription === template.description) {
      setEditDescriptionOpen(false);
      return;
    }

    setSaveLoading(true);
    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        {
          description: editedDescription.trim() || undefined,
        }
      );
      setEditDescriptionOpen(false);
    } catch (error) {
      console.error("Failed to update template description:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Failed to update template description"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const formatTemplateType = (type: TemplateType) => {
    return TemplateUtils.formatTemplateType(type);
  };

  const formatDate = (timestamp: number) => {
    return dayjs(timestamp * 1000).format("MMMM D, YYYY");
  };

  // Toolbar handlers
  const handleWeekChange = (week: number) => {
    setCurrentWeek(Math.max(0, Math.min(week, totalWeeks - 1)));
  };

  const handleWeeksToShowChange = (weeks: 1 | 2 | "all") => {
    setWeeksToShow(weeks);
    // Reset current week if it would go out of bounds
    if (weeks !== "all") {
      const maxStartWeek = totalWeeks - (weeks === 2 ? 2 : 1);
      if (currentWeek > Math.max(0, maxStartWeek)) {
        setCurrentWeek(Math.max(0, maxStartWeek));
      }
    }
  };

  const handleTemplateTypeChange = (type: TemplateType) => {
    setTemplateType(type);
  };

  const handleAddWeek = async () => {
    // Create new week data with empty demands
    const newWeekNumber = template.weeksData.length;
    const newWeekData: TemplateWeekDataDTO = {
      weekNumber: newWeekNumber,
      demands: [],
    };

    const updatedWeeksData = [...template.weeksData, newWeekData];

    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        { weeksData: updatedWeeksData }
      );
    } catch (error) {
      throw error; // Let the toolbar handle the error display
    }
  };

  const handleDeleteWeek = async (weekNumber: number) => {
    if (template.weeksData.length <= 1) {
      throw new Error("Cannot delete the last week");
    }

    // Remove the week and renumber remaining weeks
    const updatedWeeksData = template.weeksData
      .filter((week) => week.weekNumber !== weekNumber)
      .map((week, index) => ({
        ...week,
        weekNumber: index, // Renumber weeks to be consecutive
      }));

    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        { weeksData: updatedWeeksData }
      );

      // Adjust current week if necessary
      const newTotalWeeks = updatedWeeksData.length;
      if (currentWeek >= newTotalWeeks) {
        setCurrentWeek(Math.max(0, newTotalWeeks - 1));
      }
    } catch (error) {
      throw error; // Let the toolbar handle the error display
    }
  };

  const handleBuildFromDemands = () => {
    setBuildDialogOpen(true);
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
        {/* First line: Title, template info, and action buttons */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left side: Title + Template info */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Title with edit button */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="h5" component="h2">
                {template.name}
              </Typography>
              <IconButton
                size="small"
                onClick={handleEditName}
                sx={{
                  opacity: 0.6,
                  "&:hover": { opacity: 1 },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Right side: Action buttons (icons only) */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={onApply}
              color="primary"
              sx={{
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <PlayArrow />
            </IconButton>
            <IconButton
              onClick={handleDelete}
              disabled={deleteLoading}
              color="error"
            >
              {deleteLoading ? <CircularProgress size={20} /> : <Delete />}
            </IconButton>
          </Box>
        </Box>

        {/* Second line: Description */}
        {template.description && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Typography variant="body1" color="textSecondary">
              {template.description}
            </Typography>
            <IconButton
              size="small"
              onClick={handleEditDescription}
              sx={{
                opacity: 0.6,
                "&:hover": { opacity: 1 },
                mt: -0.5,
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Template Toolbar */}
        <TemplateToolbar
          lng={lng}
          template={template}
          currentWeek={currentWeek}
          weeksToShow={weeksToShow}
          templateType={templateType}
          displayedWeeks={displayedWeeks}
          totalWeeks={totalWeeks}
          onWeekChange={handleWeekChange}
          onWeeksToShowChange={handleWeeksToShowChange}
          onTemplateTypeChange={handleTemplateTypeChange}
          onAddWeek={handleAddWeek}
          onDeleteWeek={handleDeleteWeek}
          onBuildFromDemands={handleBuildFromDemands}
          onError={onError}
        />
      </Box>

      {/* Main Component */}
      <Box className="template-viewer-content" sx={{ mt: 3, p: 3 }}>
        {/* Main component placeholder - will be implemented later */}
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {t("main_component_placeholder", "Main component coming soon...")}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t(
              "template_content_description",
              "Template content and editor will be displayed here"
            )}
          </Typography>
        </Box>
      </Box>

      {/* Edit Name Dialog */}
      <Dialog
        open={editNameOpen}
        onClose={() => setEditNameOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("edit_template_name")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t("template_name")}
            fullWidth
            variant="outlined"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveName();
              }
            }}
            error={
              editedName.trim().length > 0 &&
              editedName.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH
            }
            helperText={
              editedName.trim().length > 0 &&
              editedName.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH
                ? t("template_name_too_short")
                : `${editedName.length}/${TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH}`
            }
            inputProps={{
              maxLength: TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNameOpen(false)}>{t("cancel")}</Button>
          <Button
            onClick={handleSaveName}
            variant="contained"
            disabled={
              saveLoading ||
              editedName.trim() === "" ||
              editedName.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH ||
              editedName.length > TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH
            }
          >
            {saveLoading ? <CircularProgress size={20} /> : t("save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Description Dialog */}
      <Dialog
        open={editDescriptionOpen}
        onClose={() => setEditDescriptionOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("edit_template_description")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t("template_description")}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            helperText={`${editedDescription.length}/${TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}`}
            inputProps={{
              maxLength: TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDescriptionOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSaveDescription}
            variant="contained"
            disabled={saveLoading}
          >
            {saveLoading ? <CircularProgress size={20} /> : t("save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Build From Demands Dialog */}
      <BuildFromDemandsDialog
        lng={lng}
        open={buildDialogOpen}
        onClose={() => setBuildDialogOpen(false)}
        templateName={template.name}
      />
    </Box>
  );
}
