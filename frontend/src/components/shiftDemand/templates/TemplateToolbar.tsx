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
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
} from "@mui/material";
import { ChevronLeft, ChevronRight, Add, Remove } from "@mui/icons-material";
import { useTranslation } from "../../../app/i18n/client";
import {
  ShiftDemandTemplateDTO,
  TemplateType,
  TemplateWeekDataDTO,
} from "../../../types/shift-demand-template";
import { ShiftDemandTemplateApi } from "../../../app/lib/api/shiftDemandTemplateApi";
import {
  getWeekManagementConstraints,
  validateTemplateForTypeChange,
  getValidationErrorMessage,
} from "../../../utils/templateValidation";
import { ConfirmEvenOddDialog } from "./dialogs/ConfirmEvenOddDialog";
import styles from "./TemplateToolbar.module.css";

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
  const [confirmEvenOddOpen, setConfirmEvenOddOpen] = useState(false);
  const [pendingTemplateType, setPendingTemplateType] =
    useState<TemplateType | null>(null);

  // Calculate week management constraints based on template type
  const weekConstraints = useMemo(() => {
    return getWeekManagementConstraints(templateType, totalWeeks);
  }, [templateType, totalWeeks]);

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

    // Special handling for EVEN_ODD conversion
    if (newType === TemplateType.EVEN_ODD) {
      if (totalWeeks === 2) {
        // Already has exactly 2 weeks, direct conversion
        await updateTemplateType(newType);
      } else if (totalWeeks > 2) {
        // More than 2 weeks - show confirmation dialog for deletion
        setPendingTemplateType(newType);
        setConfirmEvenOddOpen(true);
      } else {
        // Less than 2 weeks - automatically add weeks to reach 2
        await updateTemplateType(newType);
      }
      return;
    }

    // For non-EVEN_ODD conversions, proceed with validation
    const validation = validateTemplateForTypeChange(
      templateType,
      newType,
      totalWeeks
    );

    if (!validation.isValid) {
      const errorMessage = getValidationErrorMessage(
        validation.error || "unknown_error",
        newType,
        totalWeeks
      );
      onError(errorMessage);
      return;
    }

    // Direct update for standard template type changes
    await updateTemplateType(newType);
  };

  // Update template type (used by both direct update and confirmation)
  const updateTemplateType = async (newType: TemplateType) => {
    setTypeToggleLoading(true);
    try {
      // For EVEN_ODD conversion, we need to handle week adjustment
      if (newType === TemplateType.EVEN_ODD && totalWeeks !== 2) {
        await convertToEvenOddTemplate(newType);
      } else {
        await ShiftDemandTemplateApi.updateTemplate(
          template.id,
          template.teamId,
          { templateType: newType }
        );
        onTemplateTypeChange(newType);
        onTemplateUpdated();
      }
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

  // Convert template to EVEN_ODD with week adjustment
  const convertToEvenOddTemplate = async (newType: TemplateType) => {
    try {
      let adjustedWeeksData: TemplateWeekDataDTO[];

      if (totalWeeks >= 2) {
        // Template has 2 or more weeks - keep only first 2
        adjustedWeeksData = template.weeksData
          .slice(0, 2)
          .map((week, index) => ({
            ...week,
            weekNumber: index, // Renumber to 0, 1
          }));
      } else {
        // Template has fewer than 2 weeks - use existing weeks and add empty ones
        adjustedWeeksData = [...template.weeksData];

        // Renumber existing weeks
        adjustedWeeksData.forEach((week, index) => {
          week.weekNumber = index;
        });
      }

      // Ensure we have exactly 2 weeks
      while (adjustedWeeksData.length < 2) {
        adjustedWeeksData.push({
          weekNumber: adjustedWeeksData.length,
          demands: [],
        });
      }

      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        {
          templateType: newType,
          weeksData: adjustedWeeksData,
        }
      );

      onTemplateTypeChange(newType);
      onTemplateUpdated();
    } catch (error) {
      console.error("Failed to convert to Even/Odd template:", error);
      throw error;
    }
  };

  // Handle Even/Odd conversion confirmation
  const handleEvenOddConfirm = async () => {
    if (pendingTemplateType) {
      await updateTemplateType(pendingTemplateType);
      setPendingTemplateType(null);
      setConfirmEvenOddOpen(false);
    }
  };

  // Handle Even/Odd conversion cancellation
  const handleEvenOddCancel = () => {
    setPendingTemplateType(null);
    setConfirmEvenOddOpen(false);
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
    <Paper elevation={0} className={styles.toolbar}>
      <div className={styles.container}>
        {/* Left Section: Week Navigation & Management */}
        <div className={styles.leftSection}>
          {/* Week Navigator */}
          <div className={styles.weekNavigation}>
            <button
              onClick={handlePreviousWeek}
              disabled={!canNavigatePrevious}
              className={styles.iconButton}
            >
              <ChevronLeft />
            </button>
            <button
              onClick={handleNextWeek}
              disabled={!canNavigateNext}
              className={styles.iconButton}
            >
              <ChevronRight />
            </button>

            <div className={styles.weekDisplay}>
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
            </div>

            {/* Week Management - Add/Remove Buttons */}
            <div className={styles.weekManagement}>
              <Tooltip
                title={
                  weekConstraints.removeButtonDisabledReason
                    ? t(weekConstraints.removeButtonDisabledReason)
                    : t("remove_week")
                }
              >
                <span>
                  <button
                    onClick={() => handleDeleteWeekClick(totalWeeks - 1)}
                    disabled={
                      !weekConstraints.canRemoveWeek ||
                      deleteWeekLoading.get(totalWeeks - 1)
                    }
                    className={styles.iconButton}
                    style={{ marginRight: "4px" }}
                  >
                    {deleteWeekLoading.get(totalWeeks - 1) ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Remove fontSize="small" />
                    )}
                  </button>
                </span>
              </Tooltip>
              <Tooltip
                title={
                  weekConstraints.addButtonDisabledReason
                    ? t(weekConstraints.addButtonDisabledReason)
                    : t("add_week")
                }
              >
                <span>
                  <button
                    onClick={handleAddWeek}
                    disabled={!weekConstraints.canAddWeek || addWeekLoading}
                    className={styles.iconButton}
                  >
                    {addWeekLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Add fontSize="small" />
                    )}
                  </button>
                </span>
              </Tooltip>
            </div>
          </div>

          {/* Week Display Selector */}
          <FormControl size="small" className={styles.weekSelector}>
            <InputLabel>{t("show_weeks")}</InputLabel>
            <Select
              value={weeksToShow}
              label={t("show_weeks")}
              onChange={(e) =>
                onWeeksToShowChange(e.target.value as WeeksToShow)
              }
              sx={{ height: "35px", fontSize: "0.9rem" }}
            >
              <MenuItem value={1}>{t("one_week")}</MenuItem>
              <MenuItem value={2}>{t("two_weeks")}</MenuItem>
              <MenuItem value="all">{t("all_weeks")}</MenuItem>
            </Select>
          </FormControl>
        </div>

        {/* Right Section: Template Controls */}
        <div className={styles.rightSection}>
          {/* Template Type Toggle */}
          <div className={styles.templateTypeToggle}>
            <button
              onClick={(e) =>
                handleTemplateTypeChange(e, TemplateType.STANDARD)
              }
              disabled={typeToggleLoading}
              className={styles.standardButton}
              style={{
                backgroundColor:
                  templateType === TemplateType.STANDARD ? "#1976d2" : "white",
                color:
                  templateType === TemplateType.STANDARD ? "white" : "#616161",
                marginRight: "2px",
              }}
            >
              {t("standard")}
            </button>
            <button
              onClick={(e) =>
                handleTemplateTypeChange(e, TemplateType.EVEN_ODD)
              }
              disabled={typeToggleLoading}
              className={styles.standardButton}
              style={{
                backgroundColor:
                  templateType === TemplateType.EVEN_ODD ? "#1976d2" : "white",
                color:
                  templateType === TemplateType.EVEN_ODD ? "white" : "#616161",
              }}
            >
              {t("even_odd")}
            </button>
            {typeToggleLoading && (
              <CircularProgress size={16} style={{ marginLeft: "8px" }} />
            )}
          </div>

          {/* From Demands Button */}
          <button
            onClick={onBuildFromDemands}
            className={styles.standardButton}
          >
            {t("from_demands")}
          </button>
        </div>
      </div>

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

      {/* Confirm Even/Odd Conversion Dialog */}
      <ConfirmEvenOddDialog
        open={confirmEvenOddOpen}
        onClose={handleEvenOddCancel}
        onConfirm={handleEvenOddConfirm}
        currentWeeks={totalWeeks}
        weeksToDelete={
          totalWeeks > 2
            ? Array.from({ length: totalWeeks - 2 }, (_, i) => i + 2)
            : []
        }
        lng={lng}
        templateName={template.name}
      />
    </Paper>
  );
}
