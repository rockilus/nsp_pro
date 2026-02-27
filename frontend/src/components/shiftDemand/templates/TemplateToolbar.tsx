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
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
} from "@mui/material";
import { NavigateBefore, NavigateNext, Add, Remove } from "@mui/icons-material";
import { useTranslation } from "../../../app/i18n/client";
import {
  ShiftDemandTemplateDTO,
  TemplateType,
  TemplateWeekDataDTO,
} from "../../../types/shift-demand-template";
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
  onTemplateTypeChange: (type: TemplateType) => Promise<void>; // Now async handler from parent
  onAddWeek: () => Promise<void>; // Now async handler from parent
  onDeleteWeek: (weekNumber: number) => Promise<void>; // Now async handler from parent
  onBuildFromDemands: () => void;
  onError: (error: string) => void;
  // Bulk mode props
  bulkModeActive: boolean;
  onToggleBulkMode: () => void;
  updateLoading?: boolean; // New prop for loading state
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
  bulkModeActive,
  onToggleBulkMode,
  updateLoading = false,
}: TemplateToolbarProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  // Loading states
  const [addWeekLoading, setAddWeekLoading] = useState(false);
  const [deleteWeekLoading, setDeleteWeekLoading] = useState<
    Map<number, boolean>
  >(new Map());
  // Remove typeToggleLoading - use updateLoading from parent

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
    newType: TemplateType | null,
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
      totalWeeks,
    );

    if (!validation.isValid) {
      const errorMessage = getValidationErrorMessage(
        validation.error || "unknown_error",
        newType,
        totalWeeks,
      );
      onError(errorMessage);
      return;
    }

    // Direct update for standard template type changes
    await updateTemplateType(newType);
  };

  // Update template type (used by both direct update and confirmation)
  const updateTemplateType = async (newType: TemplateType) => {
    try {
      await onTemplateTypeChange(newType);
    } catch (error) {
      console.error("Failed to update template type:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Failed to update template type",
      );
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
        {/* First Group: Week Navigation & Management */}
        <div className={styles.leftSection}>
          {/* Week Navigator */}
          <div className={styles.weekNavigation}>
            <Tooltip title={t("previous_week")}>
              <span>
                <button
                  data-testid="template-toolbar-previous-week-button"
                  onClick={handlePreviousWeek}
                  disabled={!canNavigatePrevious}
                  className={styles.iconButton}
                >
                  <NavigateBefore />
                </button>
              </span>
            </Tooltip>
            <Tooltip title={t("next_week")}>
              <span>
                <button
                  data-testid="template-toolbar-next-week-button"
                  onClick={handleNextWeek}
                  disabled={!canNavigateNext}
                  className={styles.iconButton}
                >
                  <NavigateNext />
                </button>
              </span>
            </Tooltip>

            <div className={styles.weekDisplay}>
              <Typography
                variant="body2"
                fontWeight={500}
                data-testid="template-toolbar-week-display"
              >
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
                    data-testid="template-toolbar-remove-week-button"
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
                    data-testid="template-toolbar-add-week-button"
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
          {/* <FormControl size="small" className={styles.weekSelector}>
            <Select
              value={weeksToShow}
              // label={t("show_weeks")}
              onChange={(e) =>
                onWeeksToShowChange(e.target.value as WeeksToShow)
              }
              sx={{ height: "35px", fontSize: "0.9rem" }}
            >
              <MenuItem value={1}>{t("one_week")}</MenuItem>
              <MenuItem value={2}>{t("two_weeks")}</MenuItem>
              <MenuItem value="all">{t("all_weeks")}</MenuItem>
            </Select>
          </FormControl> */}
        </div>

        {/* Second Group: Template Type Toggle */}
        <div className={styles.centerSection}>
          {/* Template Type Toggle */}
          <div className={styles.templateTypeToggle}>
            <ToggleButtonGroup
              data-testid="template-toolbar-type-toggle"
              value={templateType}
              exclusive
              onChange={handleTemplateTypeChange}
              size="small"
              disabled={updateLoading}
            >
              <Tooltip title={t("standard_template_tooltip")}>
                <span>
                  <ToggleButton
                    data-testid="template-toolbar-standard-type-button"
                    value={TemplateType.STANDARD}
                  >
                    {t("standard")}
                  </ToggleButton>
                </span>
              </Tooltip>
              <Tooltip title={t("even_odd_template_tooltip")}>
                <span>
                  <ToggleButton
                    data-testid="template-toolbar-even-odd-type-button"
                    value={TemplateType.EVEN_ODD}
                  >
                    {t("even_odd")}
                  </ToggleButton>
                </span>
              </Tooltip>
            </ToggleButtonGroup>
            {updateLoading && (
              <CircularProgress size={16} style={{ marginLeft: "8px" }} />
            )}
          </div>
        </div>

        {/* Third Group: Select Button and From Demands Button */}
        <div className={styles.rightSection}>
          <Tooltip title={t("import_template_from_existing_coverage")}>
            <span>
              <button
                data-testid="template-toolbar-from-demands-button"
                onClick={onBuildFromDemands}
                className={styles.standardButton}
              >
                {t("import")}
              </button>
            </span>
          </Tooltip>

          <Tooltip title={t("select_tooltip")}>
            <span>
              <button
                data-testid="template-toolbar-select-button"
                onClick={onToggleBulkMode}
                style={{
                  borderRadius: "4px",
                  border: "1px solid #e5e7eb",
                  height: "35px",
                  padding: "0 15px",
                  fontSize: "0.9rem",
                  fontWeight: 550,
                  color: bulkModeActive ? "white" : "#616161",
                  backgroundColor: bulkModeActive ? "#1976d2" : "white",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                  marginLeft: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!bulkModeActive) {
                    e.currentTarget.style.backgroundColor = "#f0f0f0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!bulkModeActive) {
                    e.currentTarget.style.backgroundColor = "white";
                  }
                }}
              >
                {t("select", "Select")}
              </button>
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Delete Week Confirmation Dialog */}
      <Dialog
        data-testid="template-toolbar-delete-week-dialog"
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
          <Button
            data-testid="template-toolbar-delete-week-cancel-button"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            data-testid="template-toolbar-delete-week-confirm-button"
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
