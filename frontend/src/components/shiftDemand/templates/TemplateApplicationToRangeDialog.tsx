/**
 * Template Application to Date Range Dialog
 *
 * Dialog for applying a template to a specific date range with:
 * - Date range selection (start and end dates)
 * - Overwrite existing demands option
 * - Preview of application impact
 * - Warning messages about overwriting
 */

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useTranslation } from "../../../app/i18n/client";

// Configure dayjs for UTC handling
dayjs.extend(utc);
dayjs.extend(timezone);
import {
  ShiftDemandTemplateDTO,
  ApplyTemplateToDateRangeDTO,
  TemplateApplicationResult,
  TemplateType,
} from "../../../types/shift-demand-template";
import { ShiftDemandTemplateApi } from "../../../app/lib/api/shiftDemandTemplateApi";

interface TemplateApplicationToRangeDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  template: ShiftDemandTemplateDTO;
  teamId: string;
  onApplicationComplete: (result: TemplateApplicationResult) => void;
  onError: (error: string) => void;
}

export default function TemplateApplicationToRangeDialog({
  lng,
  open,
  onClose,
  template,
  teamId,
  onApplicationComplete,
  onError,
}: TemplateApplicationToRangeDialogProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  // State management
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [loading, setLoading] = useState(false);

  // Validation and preview calculations
  const validation = useMemo(() => {
    const errors: string[] = [];

    if (!startDate || !endDate) {
      errors.push(t("date_range_required"));
    } else {
      if (endDate.isBefore(startDate)) {
        errors.push(t("end_date_before_start_date"));
      }

      const daysDiff = endDate.diff(startDate, "days") + 1;
      if (daysDiff > 365) {
        errors.push(t("date_range_too_long"));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [startDate, endDate, t]);

  const previewData = useMemo(() => {
    if (!startDate || !endDate || !validation.isValid) return null;

    const totalDays = endDate.diff(startDate, "days") + 1;
    const weekCount = Math.ceil(totalDays / 7);

    return {
      totalDays,
      weekCount,
      templateWeeks: template.weeksData.length,
      templateType: template.templateType,
      estimatedDemands:
        Math.ceil(totalDays / 7) * template.weeksData.length * 2, // Rough estimate
    };
  }, [startDate, endDate, template, validation.isValid]);

  // Event handlers
  const handleStartDateChange = (newDate: Dayjs | null) => {
    // Always work in UTC to avoid timezone issues
    const utcDate = newDate ? dayjs.utc(newDate.format("YYYY-MM-DD")) : null;
    setStartDate(utcDate);
    // Auto-adjust end date if it becomes invalid
    if (utcDate && endDate && endDate.isBefore(utcDate)) {
      setEndDate(utcDate.add(6, "days")); // Default to 1 week
    }
  };

  const handleEndDateChange = (newDate: Dayjs | null) => {
    // Always work in UTC to avoid timezone issues
    const utcDate = newDate ? dayjs.utc(newDate.format("YYYY-MM-DD")) : null;
    setEndDate(utcDate);
  };

  const handleApply = async () => {
    if (!validation.isValid || !startDate || !endDate) return;

    setLoading(true);
    try {
      const request: ApplyTemplateToDateRangeDTO = {
        templateId: template.id,
        startDate: startDate.startOf("day").valueOf(), // Already UTC, so just get start of day
        endDate: endDate.endOf("day").valueOf(), // Already UTC, so just get end of day
        overwriteExisting,
      };

      // Debug logging for timezone verification
      console.log("Template Application - UTC Dates:", {
        startDateISO: startDate.toISOString(),
        endDateISO: endDate.toISOString(),
        startTimestamp: request.startDate,
        endTimestamp: request.endDate,
        startDateFromTimestamp: new Date(request.startDate).toISOString(),
        endDateFromTimestamp: new Date(request.endDate).toISOString(),
      });

      const result = await ShiftDemandTemplateApi.applyTemplateToDateRange(
        template.id,
        teamId,
        request
      );

      onApplicationComplete(result);
      onClose();
    } catch (error) {
      console.error("Failed to apply template to date range:", error);
      onError(
        error instanceof Error
          ? error.message
          : t("template_application_failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const formatTemplateType = (type: TemplateType): string => {
    switch (type) {
      case TemplateType.STANDARD:
        return t("template_type_standard");
      case TemplateType.EVEN_ODD:
        return t("template_type_even_odd");
      default:
        return type;
    }
  };

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="en"
      dateFormats={{ dayOfMonth: "DD" }}
    >
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: "500px" },
        }}
      >
        <DialogTitle>
          <Typography variant="h6">
            {t("apply_template_to_date_range")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("template_name")}: <strong>{template.name}</strong> •{" "}
            {t("template_type")}:{" "}
            <strong>{formatTemplateType(template.templateType)}</strong> •{" "}
            {t("weeks")}: <strong>{template.weeksData.length}</strong>
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Date Range Selection */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t("select_date_range")}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <DatePicker
                  label={t("start_date")}
                  value={startDate}
                  onChange={handleStartDateChange}
                  timezone="UTC"
                  slotProps={{
                    textField: {
                      error: validation.errors.some(
                        (e) => e.includes("required") || e.includes("before")
                      ),
                      sx: { minWidth: 200 },
                    },
                  }}
                />
                <DatePicker
                  label={t("end_date")}
                  value={endDate}
                  onChange={handleEndDateChange}
                  minDate={startDate || undefined}
                  timezone="UTC"
                  slotProps={{
                    textField: {
                      error: validation.errors.some(
                        (e) => e.includes("required") || e.includes("before")
                      ),
                      sx: { minWidth: 200 },
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Options */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t("application_options")}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    color="warning"
                  />
                }
                label={t("overwrite_existing_demands")}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {overwriteExisting
                  ? t("overwrite_range_warning")
                  : t("merge_not_implemented")}
              </Typography>
            </Box>

            {/* Validation Errors */}
            {validation.errors.length > 0 && (
              <Alert severity="error">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Preview */}
            {previewData && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {t("application_preview")}
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    {t("template_application_summary", {
                      days: previewData.totalDays,
                      weeks: previewData.weekCount,
                      templateWeeks: previewData.templateWeeks,
                    })}
                  </Typography>
                </Alert>

                {template.templateType === TemplateType.STANDARD && (
                  <Typography variant="body2" color="text.secondary">
                    {t("standard_template_range_explanation", {
                      weeks: template.weeksData.length,
                    })}
                  </Typography>
                )}

                {template.templateType === TemplateType.EVEN_ODD && (
                  <Typography variant="body2" color="text.secondary">
                    {t("even_odd_template_range_explanation")}
                  </Typography>
                )}
              </Box>
            )}

            {overwriteExisting && (
              <Alert severity="warning">
                <Typography variant="body2">
                  {t("overwrite_demands_warning")}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleApply}
            variant="contained"
            disabled={!validation.isValid || loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? t("applying_template") : t("apply_template")}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
