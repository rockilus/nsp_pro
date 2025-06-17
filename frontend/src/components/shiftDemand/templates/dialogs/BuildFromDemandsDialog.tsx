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
  TextField,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Build, ContentCopy } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "../../../../app/i18n/client";
import { ShiftDemandTemplateApi } from "../../../../app/lib/api/shiftDemandTemplateApi";
import {
  ShiftDemandTemplateDTO,
  ApplyDemandsToTemplateWeekDTO,
} from "../../../../types/shift-demand-template";

interface BuildFromDemandsDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  template: ShiftDemandTemplateDTO;
  teamId: string;
  onSuccess: (updatedTemplate: ShiftDemandTemplateDTO) => void;
}

export function BuildFromDemandsDialog({
  lng,
  open,
  onClose,
  template,
  teamId,
  onSuccess,
}: BuildFromDemandsDialogProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  // State for form inputs
  const [sourceWeekStart, setSourceWeekStart] = useState<Dayjs | null>(null);
  const [targetWeekNumber, setTargetWeekNumber] = useState<number>(0);
  const [isApplying, setIsApplying] = useState(false);
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

    setIsApplying(true);
    setError(null);

    try {
      // Ensure we get the Monday of the selected week
      const mondayOfWeek = sourceWeekStart.startOf("week").day(1);

      const request: ApplyDemandsToTemplateWeekDTO = {
        templateId: template.id,
        sourceWeekStartDate: mondayOfWeek.valueOf(), // timestamp
        targetWeekNumber: targetWeekNumber,
      };

      const updatedTemplate =
        await ShiftDemandTemplateApi.applyDemandsToTemplateWeek(
          template.id,
          teamId,
          request
        );

      onSuccess(updatedTemplate);
      handleClose();
    } catch (err: any) {
      console.error("Failed to apply demands to template week:", err);
      setError(err.message || t("failed_to_apply_demands_to_template_week"));
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (!isApplying) {
      setSourceWeekStart(null);
      setTargetWeekNumber(0);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Build color="primary" />
        {t("build_from_demands")}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            {t("build_from_demands_explanation")}
          </Alert>

          {/* Template Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t("template_info")}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>{t("template_name")}:</strong> {template.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>{t("total_weeks")}:</strong> {template.weeksData.length}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Source Week Selection */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t("source_week")}
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mb: 2 }}
                >
                  {t("select_source_week_explanation")}
                </Typography>
                <DatePicker
                  label={t("source_week_start_date")}
                  value={sourceWeekStart}
                  onChange={(newValue) => setSourceWeekStart(newValue)}
                  format="YYYY-MM-DD"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: t("any_day_will_find_monday"),
                    },
                  }}
                />
              </Box>

              {/* Target Week Selection */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t("target_week")}
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mb: 2 }}
                >
                  {t("select_target_week_explanation")}
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>{t("target_week_in_template")}</InputLabel>
                  <Select
                    value={targetWeekNumber}
                    onChange={(e) =>
                      setTargetWeekNumber(Number(e.target.value))
                    }
                    label={t("target_week_in_template")}
                  >
                    {availableWeeks.map((week) => (
                      <MenuItem key={week.number} value={week.number}>
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
          </LocalizationProvider>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isApplying}>
          {t("cancel")}
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={!sourceWeekStart || isApplying}
          startIcon={
            isApplying ? <CircularProgress size={20} /> : <ContentCopy />
          }
        >
          {isApplying ? t("applying") : t("apply_demands")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
