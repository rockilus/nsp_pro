"use client";

import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import {
  TemplateFromDemandsDTO,
  TemplateType,
  TEMPLATE_CONSTRAINTS,
} from "@/types/shift-demand-template";

interface CreateTemplateFromDemandsFormProps {
  onSubmit: (template: TemplateFromDemandsDTO) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const CreateTemplateFromDemandsForm: React.FC<
  CreateTemplateFromDemandsFormProps
> = ({ onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    templateType: TemplateType.STANDARD,
    startDate: dayjs(),
    endDate: dayjs().add(7, "days"), // Default to 1 week
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    } else if (formData.name.length > TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH) {
      newErrors.name = `Name must be ${TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH} characters or less`;
    }

    if (
      formData.description &&
      formData.description.length > TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH
    ) {
      newErrors.description = `Description must be ${TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters or less`;
    }

    if (formData.startDate.isAfter(formData.endDate)) {
      newErrors.dateRange = "End date must be after start date";
    }

    const daysDiff = formData.endDate.diff(formData.startDate, "days");
    if (daysDiff > TEMPLATE_CONSTRAINTS.MAX_DATE_RANGE_DAYS) {
      newErrors.dateRange = `Date range cannot exceed ${TEMPLATE_CONSTRAINTS.MAX_DATE_RANGE_DAYS} days`;
    }

    if (daysDiff < 1) {
      newErrors.dateRange = "Date range must be at least 1 day";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const templateDto: TemplateFromDemandsDTO = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        templateType: formData.templateType,
        startDate: formData.startDate.valueOf(), // Convert to timestamp
        endDate: formData.endDate.valueOf(), // Convert to timestamp
      };

      await onSubmit(templateDto);
    } catch (error) {
      console.error("Failed to create template from demands:", error);
    }
  };

  const handleDateChange =
    (field: "startDate" | "endDate") => (date: Dayjs | null) => {
      if (date) {
        setFormData({ ...formData, [field]: date });
        // Clear date range errors when dates change
        if (errors.dateRange) {
          setErrors({ ...errors, dateRange: "" });
        }
      }
    };

  const handleInputChange =
    (field: "name" | "description") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors({ ...errors, [field]: "" });
      }
    };

  return (
    <Card>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <Typography variant="h6" gutterBottom>
            Create Template from Existing Demands
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            This will analyze existing shift demands within the specified date
            range and create a template based on the patterns found. This is
            useful for creating templates from historical data.
          </Alert>

          <TextField
            fullWidth
            label="Template Name"
            value={formData.name}
            onChange={handleInputChange("name")}
            error={!!errors.name}
            helperText={
              errors.name || "Choose a descriptive name for your template"
            }
            margin="normal"
            required
            inputProps={{ maxLength: TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH }}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Description (Optional)"
            value={formData.description}
            onChange={handleInputChange("description")}
            error={!!errors.description}
            helperText={
              errors.description || "Describe what this template represents"
            }
            margin="normal"
            multiline
            rows={2}
            inputProps={{
              maxLength: TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH,
            }}
            disabled={loading}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Template Type</InputLabel>
            <Select
              value={formData.templateType}
              label="Template Type"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  templateType: e.target.value as TemplateType,
                })
              }
              disabled={loading}
            >
              <MenuItem value={TemplateType.STANDARD}>
                Standard - Single repeating pattern
              </MenuItem>
              <MenuItem value={TemplateType.EVEN_ODD}>
                Even/Odd - Alternating weekly patterns
              </MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <DatePicker
              label="Start Date"
              value={formData.startDate}
              onChange={handleDateChange("startDate")}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.dateRange,
                  margin: "normal",
                },
              }}
            />

            <DatePicker
              label="End Date"
              value={formData.endDate}
              onChange={handleDateChange("endDate")}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.dateRange,
                  helperText: errors.dateRange,
                  margin: "normal",
                },
              }}
            />
          </Box>

          {formData.startDate && formData.endDate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Analyzing {formData.endDate.diff(formData.startDate, "days")} days
              of demand data
            </Typography>
          )}

          <Box
            sx={{ display: "flex", gap: 2, mt: 3, justifyContent: "flex-end" }}
          >
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ minWidth: 140 }}
            >
              {loading ? "Creating..." : "Create from Demands"}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
