/**
 * Template Creation Dialog - Choose how to create a new template
 *
 * Currently implements basic template creation with name and description
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT } from "../../../types/shift";
import {
  ShiftDemandTemplateCreateDTO,
  TemplateType,
  TEMPLATE_CONSTRAINTS,
} from "../../../types/shift-demand-template";

interface TemplateCreationDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  teamId: string;
  shifts: ShiftT[];
  currentPeriod: {
    start: any; // Dayjs
    end: any; // Dayjs
  };
  onTemplateCreated: (templateData: ShiftDemandTemplateCreateDTO) => void;
  onError: (error: string) => void;
}

interface FormData {
  name: string;
  description: string;
}

interface FormErrors {
  name?: string;
}

export function TemplateCreationDialog({
  lng,
  open,
  onClose,
  teamId,
  shifts,
  currentPeriod,
  onTemplateCreated,
  onError,
}: TemplateCreationDialogProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t("template_name_required");
    } else if (
      formData.name.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH
    ) {
      newErrors.name = t("template_name_too_short");
    } else if (formData.name.length > TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH) {
      newErrors.name = t("template_name_too_long");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange =
    (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));

      // Clear error when user starts typing
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }

      // Clear submit error when user makes changes
      if (submitError) {
        setSubmitError("");
      }
    };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSubmitError("");

    try {
      // Create basic template data with empty week data
      const templateData: ShiftDemandTemplateCreateDTO = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        templateType: TemplateType.STANDARD,
        standardWeekData: [], // Empty for now, can be edited later
      };

      // Pass the template data to parent component for API call
      onTemplateCreated(templateData);
      handleClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("error_creating_template");
      setSubmitError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form state when closing
    setFormData({ name: "", description: "" });
    setErrors({});
    setSubmitError("");
    setIsLoading(false);
    onClose();
  };

  const isFormValid =
    formData.name.trim().length >= TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH &&
    formData.name.length <= TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH &&
    formData.description.length <= TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("create_new_template")}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <TextField
            autoFocus
            required
            fullWidth
            label={t("template_name")}
            value={formData.name}
            onChange={handleInputChange("name")}
            error={!!errors.name}
            helperText={
              errors.name ||
              `${formData.name.length}/${TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH}`
            }
            disabled={isLoading}
            sx={{ mb: 2 }}
            inputProps={{
              maxLength: TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH,
            }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label={t("template_description")}
            placeholder={t("template_description_placeholder")}
            value={formData.description}
            onChange={handleInputChange("description")}
            disabled={isLoading}
            helperText={`${formData.description.length}/${TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}`}
            inputProps={{
              maxLength: TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || !isFormValid}
          startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
        >
          {isLoading ? t("creating") : t("create_template")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
