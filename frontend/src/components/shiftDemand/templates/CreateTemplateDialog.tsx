/**
 * Create Template Dialog component
 * Allows users to create new templates or edit existing ones
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  DemandTemplate,
  ShiftDemandMatrix,
  ShiftDemandDTO,
} from "@/types/shiftDemand";
import { ShiftT } from "@/types/shift";
import { DateUtils } from "@/app/lib/utils/shiftDemandUtils";

const StepContent = styled(Box)(({ theme }) => ({
  minHeight: "300px",
  padding: theme.spacing(2, 0),
}));

const MatrixSummary = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  marginTop: theme.spacing(2),
}));

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    template: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt">
  ) => void;
  currentMatrix?: ShiftDemandMatrix;
  shifts: ShiftT[];
  teamId: string;
  editingTemplate?: DemandTemplate | null;
}

export const CreateTemplateDialog: React.FC<CreateTemplateDialogProps> = ({
  open,
  onClose,
  onSave,
  currentMatrix,
  shifts,
  teamId,
  editingTemplate,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "normal" as DemandTemplate["category"],
    isPublic: false,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Reset form when dialog opens/closes or when editing template changes
  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setFormData({
          name: editingTemplate.name,
          description: editingTemplate.description || "",
          category: editingTemplate.category,
          isPublic: editingTemplate.isPublic,
        });
      } else {
        setFormData({
          name: "",
          description: "",
          category: "normal",
          isPublic: false,
        });
      }
      setActiveStep(0);
      setValidationErrors([]);
    }
  }, [open, editingTemplate]);

  // Convert current matrix to demand DTOs
  const matrixDemands = useMemo(() => {
    if (!currentMatrix) return [];

    const demands: Partial<ShiftDemandDTO>[] = [];
    const now = Math.floor(Date.now() / 1000);

    Object.entries(currentMatrix).forEach(([shiftId, dates]) => {
      Object.entries(dates).forEach(([dateStr, count]) => {
        if (count > 0) {
          const date = new Date(dateStr);
          demands.push({
            date: Math.floor(date.getTime() / 1000),
            shiftId,
            teamId,
            count,
            notes: null,
            source: "template",
            sourceId: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      });
    });

    return demands;
  }, [currentMatrix, teamId]);

  // Calculate matrix summary
  const matrixSummary = useMemo(() => {
    if (!currentMatrix) {
      return {
        totalDemands: 0,
        uniqueDates: 0,
        uniqueShifts: 0,
        dateRange: null,
      };
    }

    let totalDemands = 0;
    const dates = new Set<string>();
    const shiftIds = new Set<string>();

    Object.entries(currentMatrix).forEach(([shiftId, shiftDates]) => {
      shiftIds.add(shiftId);
      Object.entries(shiftDates).forEach(([dateStr, count]) => {
        if (count > 0) {
          totalDemands += count;
          dates.add(dateStr);
        }
      });
    });

    const sortedDates = Array.from(dates).sort();
    const dateRange =
      sortedDates.length > 0
        ? {
            start: new Date(sortedDates[0]),
            end: new Date(sortedDates[sortedDates.length - 1]),
          }
        : null;

    return {
      totalDemands,
      uniqueDates: dates.size,
      uniqueShifts: shiftIds.size,
      dateRange,
    };
  }, [currentMatrix]);

  // Get shifts that have demands in the current matrix
  const involvedShifts = useMemo(() => {
    if (!currentMatrix) return [];

    const shiftIds = new Set(
      Object.keys(currentMatrix).filter((shiftId) =>
        Object.values(currentMatrix[shiftId]).some((count) => count > 0)
      )
    );

    return shifts.filter((shift) => shiftIds.has(shift.id));
  }, [currentMatrix, shifts]);

  const steps = ["Template Info", "Review & Save"];

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push("Template name is required");
    }

    if (formData.name.length > 100) {
      errors.push("Template name must be less than 100 characters");
    }

    if (formData.description && formData.description.length > 500) {
      errors.push("Description must be less than 500 characters");
    }

    if (
      !editingTemplate &&
      (!currentMatrix || matrixSummary.totalDemands === 0)
    ) {
      errors.push("No demand data available to save as template");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateForm()) {
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const demands = editingTemplate
      ? editingTemplate.demands
      : (matrixDemands as ShiftDemandDTO[]);

    const template: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt"> = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
      isPublic: formData.isPublic,
      demands,
      teamId,
      createdBy: "current-user", // This should come from auth context
    };

    onSave(template);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <StepContent>
            <Box display="flex" flexDirection="column" gap={3}>
              <TextField
                fullWidth
                label="Template Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                error={validationErrors.some((e) => e.includes("name"))}
                helperText="Give your template a descriptive name"
                required
              />

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                multiline
                rows={3}
                error={validationErrors.some((e) => e.includes("Description"))}
                helperText="Optional description of when to use this template"
              />

              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value as DemandTemplate["category"],
                    }))
                  }
                  label="Category"
                >
                  <MenuItem value="normal">Normal Operations</MenuItem>
                  <MenuItem value="holiday">Holiday Schedule</MenuItem>
                  <MenuItem value="emergency">Emergency Response</MenuItem>
                  <MenuItem value="weekend">Weekend Schedule</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isPublic}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isPublic: e.target.checked,
                      }))
                    }
                  />
                }
                label="Make this template available to all team members"
              />
            </Box>
          </StepContent>
        );

      case 1:
        return (
          <StepContent>
            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="h6">Review Template</Typography>

              <Box>
                <Typography variant="subtitle2">Name:</Typography>
                <Typography variant="body1">{formData.name}</Typography>
              </Box>

              {formData.description && (
                <Box>
                  <Typography variant="subtitle2">Description:</Typography>
                  <Typography variant="body1">
                    {formData.description}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2">Category:</Typography>
                <Typography variant="body1">
                  {formData.category.charAt(0).toUpperCase() +
                    formData.category.slice(1)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2">Visibility:</Typography>
                <Typography variant="body1">
                  {formData.isPublic
                    ? "Public (all team members)"
                    : "Private (only you)"}
                </Typography>
              </Box>

              {/* Matrix Summary */}
              <MatrixSummary>
                <Typography variant="subtitle2" gutterBottom>
                  Template Data Summary
                </Typography>
                <Box display="flex" gap={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Demands
                    </Typography>
                    <Typography variant="h6">
                      {editingTemplate
                        ? editingTemplate.demands.length
                        : matrixSummary.totalDemands}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Days Covered
                    </Typography>
                    <Typography variant="h6">
                      {editingTemplate
                        ? new Set(
                            editingTemplate.demands.map(
                              (d) =>
                                new Date(d.date * 1000)
                                  .toISOString()
                                  .split("T")[0]
                            )
                          ).size
                        : matrixSummary.uniqueDates}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Shifts
                    </Typography>
                    <Typography variant="h6">
                      {editingTemplate
                        ? new Set(editingTemplate.demands.map((d) => d.shiftId))
                            .size
                        : matrixSummary.uniqueShifts}
                    </Typography>
                  </Box>
                </Box>

                {involvedShifts.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Involved Shifts:
                    </Typography>
                    <Typography variant="body2">
                      {involvedShifts.map((s) => s.name).join(", ")}
                    </Typography>
                  </Box>
                )}

                {matrixSummary.dateRange && (
                  <Box mt={1}>
                    <Typography variant="body2" color="text.secondary">
                      Date range:{" "}
                      {matrixSummary.dateRange.start.toLocaleDateString()} -{" "}
                      {matrixSummary.dateRange.end.toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
              </MatrixSummary>
            </Box>
          </StepContent>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: "500px" },
      }}
    >
      <DialogTitle>
        {editingTemplate ? "Edit Template" : "Save as Template"}
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}

        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={validationErrors.length > 0}
          >
            {editingTemplate ? "Update Template" : "Save Template"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
