/**
 * Template Editor Component - Edit template metadata and week demands
 *
 * Provides interface for:
 * - Basic template information (name, description, type)
 * - Week demand management with our new DemandEntry structure
 * - Save/cancel actions
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
} from "@mui/material";
import { ArrowBack, Save, Cancel, Add } from "@mui/icons-material";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT } from "../../../types/shift";
import {
  ShiftDemandTemplateDTO,
  ShiftDemandTemplateUpdateDTO,
  TemplateWeekDataDTO,
  DemandEntryDTO,
  TemplateType,
  TEMPLATE_CONSTRAINTS,
} from "../../../types/shift-demand-template";
import { DemandEntryList } from "../../templates/DemandEntryEditor";

interface TemplateEditorProps {
  lng: string;
  template: ShiftDemandTemplateDTO;
  shifts: ShiftT[];
  onSave: (updateData: ShiftDemandTemplateUpdateDTO) => void;
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

  // Form state
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || "",
    templateType: template.templateType as TemplateType,
  });

  const [weeksData, setWeeksData] = useState<TemplateWeekDataDTO[]>(
    template.weeksData
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("name_required");
    } else if (formData.name.length > TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH) {
      newErrors.name = t("name_too_long");
    }

    if (
      formData.description &&
      formData.description.length > TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH
    ) {
      newErrors.description = t("description_too_long");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Handle week data changes
  const handleWeekDataChange = (
    weekIndex: number,
    demands: DemandEntryDTO[]
  ) => {
    setWeeksData((prev) =>
      prev.map((week, index) =>
        index === weekIndex ? { ...week, demands } : week
      )
    );
  };

  // Add new week
  const handleAddWeek = () => {
    const newWeekNumber = weeksData.length;
    setWeeksData((prev) => [
      ...prev,
      { weekNumber: newWeekNumber, demands: [] },
    ]);
  };

  // Remove week
  const handleRemoveWeek = (weekIndex: number) => {
    setWeeksData((prev) => prev.filter((_, index) => index !== weekIndex));
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const updateData: ShiftDemandTemplateUpdateDTO = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        templateType: formData.templateType,
        weeksData: weeksData,
      };

      onSave(updateData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("error_saving_template");
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className="template-editor-container">
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={onCancel}
            variant="outlined"
          >
            {t("back")}
          </Button>
          <Typography variant="h5" component="h2">
            {t("edit_template")}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} /> : <Save />}
            onClick={handleSave}
            disabled={isLoading}
            color="primary"
          >
            {t("save")}
          </Button>
        </Box>
      </Box>

      {/* Basic Information */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t("template_information")} />
        <CardContent>
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField
              label={t("template_name")}
              value={formData.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              required
            />

            <TextField
              label={t("description")}
              value={formData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              fullWidth
              multiline
              rows={3}
            />

            <FormControl fullWidth>
              <InputLabel>{t("template_type")}</InputLabel>
              <Select
                value={formData.templateType}
                onChange={(e) =>
                  handleFieldChange("templateType", e.target.value)
                }
                label={t("template_type")}
              >
                <MenuItem value="standard">{t("standard")}</MenuItem>
                <MenuItem value="even_odd">{t("even_odd")}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Week Data */}
      <Card>
        <CardHeader
          title={t("week_demands")}
          action={
            <Button
              startIcon={<Add />}
              onClick={handleAddWeek}
              variant="outlined"
              size="small"
            >
              {t("add_week")}
            </Button>
          }
        />
        <CardContent>
          {weeksData.length === 0 ? (
            <Alert severity="info">{t("no_weeks_defined")}</Alert>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {weeksData.map((weekData, index) => (
                <Box key={index}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6">
                      {formData.templateType === "standard"
                        ? t("weekly_demands")
                        : index === 0
                        ? t("even_week")
                        : t("odd_week")}{" "}
                      {formData.templateType !== "standard" &&
                        `(${t("week")} ${weekData.weekNumber})`}
                    </Typography>
                    {weeksData.length > 1 && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveWeek(index)}
                      >
                        {t("remove")}
                      </Button>
                    )}
                  </Box>

                  <DemandEntryList
                    demands={weekData.demands}
                    shifts={shifts}
                    onChange={(demands: DemandEntryDTO[]) =>
                      handleWeekDataChange(index, demands)
                    }
                  />

                  {index < weeksData.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
