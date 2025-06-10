/**
 * Template Preview component
 * Shows a visual preview of a demand template before applying
 */

"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { DemandTemplate, ShiftDemandMatrix } from "@/types/shiftDemand";
import { ShiftT } from "@/types/shift";
import { DateUtils } from "@/app/lib/utils/shiftDemandUtils";

const PreviewContainer = styled(Box)(({ theme }) => ({
  minHeight: "400px",
  maxHeight: "600px",
  overflow: "auto",
}));

const PreviewTable = styled(TableContainer)(({ theme }) => ({
  maxHeight: "300px",
  overflow: "auto",
}));

const SummaryBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
}));

interface TemplatePreviewProps {
  open: boolean;
  onClose: () => void;
  template: DemandTemplate;
  shifts: ShiftT[];
  onApply: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  open,
  onClose,
  template,
  shifts,
  onApply,
}) => {
  // Convert template demands to matrix for easier display
  const previewMatrix = useMemo(() => {
    const matrix: ShiftDemandMatrix = {};

    template.demands.forEach((demand) => {
      if (!matrix[demand.shiftId]) {
        matrix[demand.shiftId] = {};
      }
      const dateStr = new Date(demand.date * 1000).toISOString().split("T")[0];
      matrix[demand.shiftId][dateStr] = demand.count;
    });

    return matrix;
  }, [template]);

  // Get unique dates from template
  const templateDates = useMemo(() => {
    const dates = template.demands.map((d) => new Date(d.date * 1000));
    return dates.sort((a, b) => a.getTime() - b.getTime());
  }, [template]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalDemands = template.demands.reduce((sum, d) => sum + d.count, 0);
    const uniqueDates = new Set(
      template.demands.map(
        (d) => new Date(d.date * 1000).toISOString().split("T")[0]
      )
    ).size;
    const uniqueShifts = new Set(template.demands.map((d) => d.shiftId)).size;

    return {
      totalDemands,
      uniqueDates,
      uniqueShifts,
      avgPerDay: uniqueDates > 0 ? Math.round(totalDemands / uniqueDates) : 0,
    };
  }, [template]);

  // Get shifts involved in template
  const involvedShifts = useMemo(() => {
    const shiftIds = new Set(template.demands.map((d) => d.shiftId));
    return shifts.filter((shift) => shiftIds.has(shift.id));
  }, [template, shifts]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "normal":
        return "default";
      case "holiday":
        return "warning";
      case "emergency":
        return "error";
      case "weekend":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: "80vh" },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">{template.name}</Typography>
            <Box display="flex" gap={1} mt={1}>
              <Chip
                label={template.category}
                color={getCategoryColor(template.category) as any}
                size="small"
              />
              {template.isPublic && (
                <Chip label="Public" size="small" variant="outlined" />
              )}
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <PreviewContainer>
          {/* Template Description */}
          {template.description && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {template.description}
            </Typography>
          )}

          {/* Summary Statistics */}
          <SummaryBox>
            <Typography variant="subtitle2" gutterBottom>
              Template Summary
            </Typography>
            <Box display="flex" gap={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Demands
                </Typography>
                <Typography variant="h6">{summary.totalDemands}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Days Covered
                </Typography>
                <Typography variant="h6">{summary.uniqueDates}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Shifts Involved
                </Typography>
                <Typography variant="h6">{summary.uniqueShifts}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Avg per Day
                </Typography>
                <Typography variant="h6">{summary.avgPerDay}</Typography>
              </Box>
            </Box>
          </SummaryBox>

          {/* Shifts Overview */}
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Shifts in Template
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {involvedShifts.map((shift) => (
                <Chip
                  key={shift.id}
                  label={shift.name}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Box>

          {/* Demand Matrix Preview */}
          <Typography variant="subtitle2" gutterBottom>
            Demand Pattern
          </Typography>

          {templateDates.length > 0 ? (
            <PreviewTable>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Shift</TableCell>
                    {templateDates.slice(0, 14).map((date, index) => (
                      <TableCell key={index} align="center">
                        {formatDate(date)}
                      </TableCell>
                    ))}
                    {templateDates.length > 14 && (
                      <TableCell align="center">
                        ...+{templateDates.length - 14} more
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {involvedShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" noWrap>
                          {shift.name}
                        </Typography>
                      </TableCell>
                      {templateDates.slice(0, 14).map((date, index) => {
                        const dateStr = date.toISOString().split("T")[0];
                        const count = previewMatrix[shift.id]?.[dateStr] || 0;
                        return (
                          <TableCell key={index} align="center">
                            {count > 0 && (
                              <Typography
                                variant="body2"
                                color={
                                  count > 5
                                    ? "error"
                                    : count > 2
                                    ? "warning.main"
                                    : "text.primary"
                                }
                                fontWeight={count > 0 ? "bold" : "normal"}
                              >
                                {count}
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })}
                      {templateDates.length > 14 && (
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">
                            ...
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PreviewTable>
          ) : (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height={200}
              border={1}
              borderColor="divider"
              borderRadius={1}
            >
              <Typography variant="body2" color="text.secondary">
                No demand data in this template
              </Typography>
            </Box>
          )}

          {/* Date Range Info */}
          {templateDates.length > 0 && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                Date range: {formatDate(templateDates[0])} -{" "}
                {formatDate(templateDates[templateDates.length - 1])}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created: {new Date(template.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </PreviewContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onApply}
          disabled={template.demands.length === 0}
        >
          Apply Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};
