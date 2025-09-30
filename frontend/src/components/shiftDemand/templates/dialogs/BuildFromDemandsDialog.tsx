/**
 * Build From Demands Dialog - Build template from existing shift demands
 *
 * Allows users to select a source week and target week in template
 * to copy demands from existing shift demands into the template.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { Build, ContentCopy } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useTranslation } from "../../../../app/i18n/client";

// Extend dayjs with UTC and timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);
import { ShiftDemandTemplateDTO } from "../../../../types/shift-demand-template";

interface BuildFromDemandsDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  template: ShiftDemandTemplateDTO;
  onApplyDemands: (
    sourceWeekStartDate: number,
    targetWeekNumber: number
  ) => Promise<void>;
  applyLoading?: boolean;
}

export function BuildFromDemandsDialog({
  lng,
  open,
  onClose,
  template,
  onApplyDemands,
  applyLoading = false,
}: BuildFromDemandsDialogProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  // State for form inputs (using UTC dates to avoid timezone issues)
  const [sourceWeekStart, setSourceWeekStart] = useState<Dayjs | null>(null);
  const [targetWeekNumber, setTargetWeekNumber] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Available weeks in the template
  const availableWeeks = template.weeksData.map((week) => ({
    number: week.weekNumber,
    label: `${t("week")} ${week.weekNumber + 1}`,
  }));

  const handleApply = async () => {
    if (!sourceWeekStart) {
      setError(t("please_select_source_week"));
      return;
    }

    setError(null);

    try {
      // Ensure we get the Monday of the selected week in UTC
      const mondayOfWeek = sourceWeekStart.utc().startOf("week").day(1);

      await onApplyDemands(
        Math.floor(mondayOfWeek.valueOf() / 1000), // Convert ms to seconds (Unix timestamp)
        targetWeekNumber
      );

      handleClose();
    } catch (err: any) {
      console.error("Failed to apply demands to template week:", err);
      setError(err.message || t("failed_to_apply_demands_to_template_week"));
    }
  };

  const handleClose = () => {
    if (!applyLoading) {
      setSourceWeekStart(null);
      setTargetWeekNumber(0);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      data-testid="build-from-demands-dialog"
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Build color="primary" />
        {t("build_from_demands")}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            {t("build_from_demands_explanation")}
          </Alert>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Source Week Selection */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t("source_week")}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {t("select_source_week_explanation")}
              </Typography>
              <DatePicker
                data-testid="source-week-date-picker"
                label={t("source_week_start_date")}
                value={sourceWeekStart}
                onChange={(newValue) =>
                  setSourceWeekStart(newValue ? newValue.utc() : null)
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: t("any_day_will_find_monday"),
                    inputProps: {
                      "data-testid": "source-week-date-input",
                    },
                  },
                }}
              />
            </Box>

            {/* Target Week Selection */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t("target_week")}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {t("select_target_week_explanation")}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>{t("target_week_in_template")}</InputLabel>
                <Select
                  data-testid="target-week-select"
                  value={targetWeekNumber}
                  onChange={(e) => setTargetWeekNumber(Number(e.target.value))}
                  label={t("target_week_in_template")}
                >
                  {availableWeeks.map((week) => (
                    <MenuItem
                      key={week.number}
                      value={week.number}
                      data-testid={`target-week-option-${week.number}`}
                    >
                      {week.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Warning about overwriting */}
            <Alert severity="warning">
              <Typography variant="body2">
                {t("overwrite_warning", {
                  weekNumber: targetWeekNumber + 1,
                })}
              </Typography>
            </Alert>

            {/* Error display */}
            {error && (
              <Alert severity="error">
                <Typography variant="body2">{error}</Typography>
              </Alert>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          data-testid="build-from-demands-cancel-button"
          onClick={handleClose}
          disabled={applyLoading}
        >
          {t("cancel")}
        </Button>
        <Button
          data-testid="build-from-demands-apply-button"
          onClick={handleApply}
          variant="contained"
          disabled={!sourceWeekStart || applyLoading}
          startIcon={
            applyLoading ? <CircularProgress size={20} /> : <ContentCopy />
          }
        >
          {applyLoading ? t("applying") : t("apply_demands")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
