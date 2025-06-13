/**
 * Template Toolbar Component - Navigation and management controls for templates
 *
 * Features:
 * - Week navigation (previous/next, current week display)
 * - Week management (add/delete weeks)
 * - Week display selector (1, 2, or all weeks)
 * - Template type toggle (standard/even-odd)
 * - Build from demands button
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Remove,
  Build,
  Delete,
} from "@mui/icons-material";
import { useTranslation } from "../../../app/i18n/client";
import {
  ShiftDemandTemplateDTO,
  TemplateType,
  TemplateWeekDataDTO,
} from "../../../types/shift-demand-template";
import { ShiftDemandTemplateApi } from "../../../app/lib/api/shiftDemandTemplateApi";

type WeeksToShow = 1 | 2 | "all";

interface TemplateToolbarProps {
  lng: string;
  template: ShiftDemandTemplateDTO;
  currentWeek: number;
  weeksToShow: WeeksToShow;
  templateType: TemplateType;
  displayedWeeks: number[];
  totalWeeks: number;
  onWeekChange: (week: number) => void;
  onWeeksToShowChange: (weeks: WeeksToShow) => void;
  onTemplateTypeChange: (type: TemplateType) => void;
  onAddWeek: () => Promise<void>;
  onDeleteWeek: (weekNumber: number) => Promise<void>;
  onBuildFromDemands: () => void;
  onError: (error: string) => void;
  onTemplateUpdated: () => void; // Callback to refresh template data
}

export function TemplateToolbar({
  lng,
  template,
  currentWeek,
  weeksToShow,
  templateType,
  displayedWeeks,
  totalWeeks,
  onWeekChange,
  onWeeksToShowChange,
  onTemplateTypeChange,
  onAddWeek,
  onDeleteWeek,
  onBuildFromDemands,
  onError,
  onTemplateUpdated,
}: TemplateToolbarProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  // Loading states
  const [addWeekLoading, setAddWeekLoading] = useState(false);
  const [deleteWeekLoading, setDeleteWeekLoading] = useState<
    Map<number, boolean>
  >(new Map());
  const [typeToggleLoading, setTypeToggleLoading] = useState(false);

  // Confirmation dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [weekToDelete, setWeekToDelete] = useState<number | null>(null);

  // Navigation logic
  const canNavigatePrevious = useMemo(() => {
    if (weeksToShow === "all") return false;
    return currentWeek > 0;
  }, [currentWeek, weeksToShow]);

  const canNavigateNext = useMemo(() => {
    if (weeksToShow === "all") return false;
    const maxStartWeek = totalWeeks - (weeksToShow === 2 ? 2 : 1);
    return currentWeek < Math.max(0, maxStartWeek);
  }, [currentWeek, weeksToShow, totalWeeks]);

  // Week navigation handlers
  const handlePreviousWeek = () => {
    if (canNavigatePrevious) {
      onWeekChange(currentWeek - 1);
    }
  };

  const handleNextWeek = () => {
    if (canNavigateNext) {
      onWeekChange(currentWeek + 1);
    }
  };

  // Week management handlers
  const handleAddWeek = async () => {
    setAddWeekLoading(true);
    try {
      await onAddWeek();
    } catch (error) {
      console.error("Failed to add week:", error);
      onError(error instanceof Error ? error.message : "Failed to add week");
    } finally {
      setAddWeekLoading(false);
    }
  };

  const handleDeleteWeekClick = (weekNumber: number) => {
    setWeekToDelete(weekNumber);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteWeekConfirm = async () => {
    if (weekToDelete === null) return;

    const weekNum = weekToDelete;
    setDeleteWeekLoading((prev) => new Map(prev.set(weekNum, true)));

    try {
      await onDeleteWeek(weekNum);
      setDeleteConfirmOpen(false);
      setWeekToDelete(null);
    } catch (error) {
      console.error("Failed to delete week:", error);
      onError(error instanceof Error ? error.message : "Failed to delete week");
    } finally {
      setDeleteWeekLoading((prev) => {
        const newMap = new Map(prev);
        newMap.delete(weekNum);
        return newMap;
      });
    }
  };

  // Template type toggle handler
  const handleTemplateTypeChange = async (
    event: React.MouseEvent<HTMLElement>,
    newType: TemplateType | null
  ) => {
    if (newType === null || newType === templateType) return;

    setTypeToggleLoading(true);
    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        { templateType: newType }
      );
      onTemplateTypeChange(newType);
      onTemplateUpdated(); // Refresh template data
    } catch (error) {
      console.error("Failed to update template type:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Failed to update template type"
      );
    } finally {
      setTypeToggleLoading(false);
    }
  };

  // Format displayed weeks
  const formatDisplayedWeeks = () => {
    if (weeksToShow === "all") {
      return t("all_weeks");
    }
    if (displayedWeeks.length === 1) {
      return displayedWeeks[0] + 1;
    }
    return displayedWeeks.map((w) => w + 1).join(", ");
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 2,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {/* Left Section: Week Navigation & Management */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Week Navigator */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={handlePreviousWeek}
            disabled={!canNavigatePrevious}
            size="small"
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            onClick={handleNextWeek}
            disabled={!canNavigateNext}
            size="small"
          >
            <ChevronRight />
          </IconButton>

          <Box sx={{ minWidth: 120, textAlign: "center" }}>
            <Typography variant="body2" fontWeight={500}>
              {weeksToShow === "all" ? (
                formatDisplayedWeeks()
              ) : (
                <>
                  {t("week")} {formatDisplayedWeeks()}
                  <Typography
                    component="span"
                    variant="caption"
                    color="textSecondary"
                  >
                    /{totalWeeks}
                  </Typography>
                </>
              )}
            </Typography>
          </Box>

          {/* Week Management - Add/Remove Buttons */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ToggleButtonGroup size="small" sx={{ height: 32 }}>
              <ToggleButton
                value="remove"
                onClick={() => handleDeleteWeekClick(totalWeeks - 1)}
                disabled={
                  totalWeeks <= 1 || deleteWeekLoading.get(totalWeeks - 1)
                }
                sx={{ px: 1, minWidth: 32 }}
              >
                {deleteWeekLoading.get(totalWeeks - 1) ? (
                  <CircularProgress size={16} />
                ) : (
                  <Remove fontSize="small" />
                )}
              </ToggleButton>
              <ToggleButton
                value="add"
                onClick={handleAddWeek}
                disabled={addWeekLoading || totalWeeks >= 8}
                sx={{ px: 1, minWidth: 32 }}
              >
                {addWeekLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <Add fontSize="small" />
                )}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Week Display Selector */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{t("show_weeks")}</InputLabel>
          <Select
            value={weeksToShow}
            label={t("show_weeks")}
            onChange={(e) => onWeeksToShowChange(e.target.value as WeeksToShow)}
          >
            <MenuItem value={1}>{t("one_week")}</MenuItem>
            <MenuItem value={2}>{t("two_weeks")}</MenuItem>
            <MenuItem value="all">{t("all_weeks")}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Right Section: Template Controls */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Template Type Toggle */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" color="textSecondary">
            {t("template_type")}:
          </Typography>
          <ToggleButtonGroup
            value={templateType}
            exclusive
            onChange={handleTemplateTypeChange}
            size="small"
            disabled={typeToggleLoading}
          >
            <ToggleButton value={TemplateType.STANDARD}>
              {t("standard")}
            </ToggleButton>
            <ToggleButton value={TemplateType.EVEN_ODD}>
              {t("even_odd")}
            </ToggleButton>
          </ToggleButtonGroup>
          {typeToggleLoading && <CircularProgress size={16} />}
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Build from Demands Button */}
        <Button
          startIcon={<Build />}
          onClick={onBuildFromDemands}
          variant="outlined"
          size="small"
        >
          {t("build_from_demands")}
        </Button>
      </Box>

      {/* Delete Week Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("confirm_delete_week")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("confirm_delete_week_message", {
              week: weekToDelete !== null ? weekToDelete + 1 : "",
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleDeleteWeekConfirm}
            color="error"
            variant="contained"
            disabled={
              weekToDelete !== null && deleteWeekLoading.get(weekToDelete)
            }
          >
            {weekToDelete !== null && deleteWeekLoading.get(weekToDelete) ? (
              <CircularProgress size={20} />
            ) : (
              t("delete")
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
