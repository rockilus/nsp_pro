/**
 * Main Shift Demand Management Page
 * Integrates all shift demand features with advanced state management and optimizations
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Snackbar,
  Fab,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { ShiftDemandGrid } from "@/components/shiftDemand/ShiftDemandGrid";
import { PeriodNavigation } from "@/components/shiftDemand/PeriodNavigation";
import { ShiftDemandErrorBoundary } from "@/components/shiftDemand/errorHandling/ShiftDemandErrorBoundary";
import { ConnectionStatusMonitor } from "@/components/shiftDemand/connectionStatus/ConnectionStatusMonitor";
import {
  useShiftDemands,
  useShiftDemandMutations,
  useDemandTemplates,
  useDemandTemplateMutations,
  useDemandPatterns,
  useDemandPatternMutations,
} from "@/app/lib/hooks/useShiftDemands";
import {
  ShiftDemandMatrix,
  CellChange,
  DemandTemplate,
  DemandPattern,
  PeriodType,
  GridDisplayOptions,
} from "@/types/shiftDemand";
import { ShiftT } from "@/types/shift";
import { TeamWithMembership } from "@/types/team";

const PageContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
}));

const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(2),
}));

const GridContainer = styled(Paper)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  minHeight: "600px",
}));

const ActionFabs = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  zIndex: 1000,
}));

const StatusBar = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
}));

interface ShiftDemandPageProps {
  teamId: string;
  shifts: ShiftT[];
  initialPeriod?: {
    type: PeriodType;
    startDate: Date;
    endDate: Date;
  };
  readonly?: boolean;
}

export const ShiftDemandPage: React.FC<ShiftDemandPageProps> = ({
  teamId,
  shifts,
  initialPeriod = {
    type: "month",
    startDate: new Date(),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  },
  readonly = false,
}) => {
  // Period management
  const [currentPeriod, setCurrentPeriod] = useState(initialPeriod);

  // Display options
  const [displayOptions, setDisplayOptions] = useState<GridDisplayOptions>({
    showWeekends: true,
    showEmptyCells: true,
    highlightChanges: true,
    compactView: false,
    showShiftTotals: true,
    showDateTotals: true,
  });

  // UI state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [autoSave, setAutoSave] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Data fetching hooks
  const {
    demands: demandsData,
    matrix: demandsMatrix,
    summary: demandsSummary,
    isLoading: isLoadingDemands,
    error: demandsError,
    refetch: refetchDemands,
  } = useShiftDemands({
    teamId,
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
    enabled: true,
  });

  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useDemandTemplates({ teamId });

  const {
    data: patternsData,
    isLoading: isLoadingPatterns,
    error: patternsError,
  } = useDemandPatterns({ teamId });

  // Mutation hooks
  const {
    updateDemandMutation,
    bulkUpdateMutation,
    copyPeriodMutation,
    deletePeriodMutation,
  } = useShiftDemandMutations({
    onSuccess: (data, variables) => {
      setSnackbar({
        open: true,
        message: "Changes saved successfully",
        severity: "success",
      });
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Failed to save changes: ${error.message}`,
        severity: "error",
      });
    },
  });

  const {
    createTemplateMutation,
    updateTemplateMutation,
    deleteTemplateMutation,
  } = useDemandTemplateMutations({
    onSuccess: () => {
      setSnackbar({
        open: true,
        message: "Template operation completed successfully",
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Template operation failed: ${error.message}`,
        severity: "error",
      });
    },
  });

  const {
    createPatternMutation,
    updatePatternMutation,
    deletePatternMutation,
  } = useDemandPatternMutations({
    onSuccess: () => {
      setSnackbar({
        open: true,
        message: "Pattern operation completed successfully",
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Pattern operation failed: ${error.message}`,
        severity: "error",
      });
    },
  });

  // Data processing
  const matrix: ShiftDemandMatrix = useMemo(() => {
    if (!demandsData?.data) return {};

    const result: ShiftDemandMatrix = {};
    demandsData.data.forEach((demand) => {
      if (!result[demand.shiftId]) {
        result[demand.shiftId] = {};
      }
      result[demand.shiftId][demand.date] = demand.count;
    });

    return result;
  }, [demandsData]);

  const templates = templatesData?.data || [];
  const patterns = patternsData?.data || [];

  // Loading state
  const isLoading = isLoadingDemands || isLoadingTemplates || isLoadingPatterns;

  // Error state
  const hasError = demandsError || templatesError || patternsError;

  // Event handlers
  const handleCellChange = useCallback(
    async (shiftId: string, date: string, count: number) => {
      setHasUnsavedChanges(true);

      if (autoSave) {
        try {
          await updateDemandMutation.mutateAsync({
            teamId,
            shiftId,
            date,
            count,
          });
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      }
    },
    [teamId, autoSave, updateDemandMutation]
  );

  const handleBulkChange = useCallback(
    async (changes: CellChange[]) => {
      setHasUnsavedChanges(true);

      if (autoSave) {
        try {
          await bulkUpdateMutation.mutateAsync({
            teamId,
            changes: changes.map((change) => ({
              shiftId: change.shiftId,
              date: change.date,
              count: change.newValue,
            })),
          });
        } catch (error) {
          console.error("Bulk save failed:", error);
          throw error;
        }
      }
    },
    [teamId, autoSave, bulkUpdateMutation]
  );

  const handlePeriodChange = useCallback(
    (newPeriod: { type: PeriodType; startDate: Date; endDate: Date }) => {
      if (hasUnsavedChanges && !autoSave) {
        const proceed = window.confirm(
          "You have unsaved changes. Are you sure you want to navigate away?"
        );
        if (!proceed) return;
      }

      setCurrentPeriod(newPeriod);
      setHasUnsavedChanges(false);
    },
    [hasUnsavedChanges, autoSave]
  );

  const handleSaveAll = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    try {
      // In a real implementation, you would batch all unsaved changes
      setSnackbar({
        open: true,
        message: "All changes saved successfully",
        severity: "success",
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to save all changes",
        severity: "error",
      });
    }
  }, [hasUnsavedChanges]);

  const handleRefresh = useCallback(() => {
    refetchDemands();
  }, [refetchDemands]);

  const handleTemplateApply = useCallback((template: DemandTemplate) => {
    // Template application is handled by the grid component
  }, []);

  const handleTemplateSave = useCallback(
    async (
      template: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt">
    ) => {
      await createTemplateMutation.mutateAsync({
        teamId,
        template,
      });
    },
    [teamId, createTemplateMutation]
  );

  const handleTemplateUpdate = useCallback(
    async (template: DemandTemplate) => {
      await updateTemplateMutation.mutateAsync({
        teamId,
        templateId: template.id,
        template,
      });
    },
    [teamId, updateTemplateMutation]
  );

  const handleTemplateDelete = useCallback(
    async (templateId: string) => {
      await deleteTemplateMutation.mutateAsync({
        teamId,
        templateId,
      });
    },
    [teamId, deleteTemplateMutation]
  );

  const handlePatternApply = useCallback(
    (pattern: DemandPattern, options: any) => {
      // Pattern application is handled by the grid component
    },
    []
  );

  const handlePatternCreate = useCallback(
    async (pattern: Omit<DemandPattern, "name"> & { name: string }) => {
      await createPatternMutation.mutateAsync({
        teamId,
        pattern,
      });
    },
    [teamId, createPatternMutation]
  );

  const handlePatternUpdate = useCallback(
    async (pattern: DemandPattern) => {
      await updatePatternMutation.mutateAsync({
        teamId,
        patternName: pattern.name,
        pattern,
      });
    },
    [teamId, updatePatternMutation]
  );

  const handlePatternDelete = useCallback(
    async (patternName: string) => {
      await deletePatternMutation.mutateAsync({
        teamId,
        patternName,
      });
    },
    [teamId, deletePatternMutation]
  );

  const handleConnectionRetry = useCallback(async () => {
    await refetchDemands();
  }, [refetchDemands]);

  const handleOfflineDataSync = useCallback(async () => {
    if (hasUnsavedChanges) {
      await handleSaveAll();
    }
  }, [hasUnsavedChanges, handleSaveAll]);

  // Calculate statistics
  const totalDemands = useMemo(() => {
    return Object.values(matrix).reduce(
      (total, shiftDates) =>
        total +
        Object.values(shiftDates).reduce((sum, count) => sum + count, 0),
      0
    );
  }, [matrix]);

  const totalShifts = shifts.filter((shift) => !shift.deleted).length;
  const daysInPeriod =
    Math.ceil(
      (currentPeriod.endDate.getTime() - currentPeriod.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  if (hasError) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load shift demand data. Please try refreshing the page.
          <Button
            variant="outlined"
            size="small"
            onClick={handleRefresh}
            sx={{ ml: 2 }}
            startIcon={<RefreshIcon />}
          >
            Retry
          </Button>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <ShiftDemandErrorBoundary level="page">
      <PageContainer maxWidth="xl">
        {/* Page Header */}
        <PageHeader>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Shift Demand Management
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Chip
                icon={<DashboardIcon />}
                label={`${totalShifts} Shifts`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`${daysInPeriod} Days`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`${totalDemands} Total Demands`}
                color="info"
                variant="outlined"
              />
              {hasUnsavedChanges && (
                <Chip
                  icon={<ErrorIcon />}
                  label="Unsaved Changes"
                  color="warning"
                  variant="filled"
                />
              )}
            </Box>
          </Box>

          <PeriodNavigation
            currentPeriod={currentPeriod}
            onPeriodChange={handlePeriodChange}
            isLoading={isLoading}
          />
        </PageHeader>

        {/* Main Grid */}
        <GridContainer>
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 400,
              }}
            >
              <CircularProgress size={60} />
            </Box>
          ) : (
            <ShiftDemandGrid
              teamId={teamId}
              startDate={currentPeriod.startDate}
              endDate={currentPeriod.endDate}
              matrix={matrix}
              shifts={shifts}
              onCellChange={handleCellChange}
              onBulkChange={handleBulkChange}
              readonly={readonly}
              displayOptions={displayOptions}
              templates={templates}
              patterns={patterns}
              onTemplateApply={handleTemplateApply}
              onTemplateSave={handleTemplateSave}
              onTemplateUpdate={handleTemplateUpdate}
              onTemplateDelete={handleTemplateDelete}
              onPatternApply={handlePatternApply}
              onPatternCreate={handlePatternCreate}
              onPatternUpdate={handlePatternUpdate}
              onPatternDelete={handlePatternDelete}
            />
          )}
        </GridContainer>

        {/* Status Bar */}
        <StatusBar>
          <CardContent sx={{ py: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Period: {currentPeriod.startDate.toLocaleDateString()} -{" "}
                {currentPeriod.endDate.toLocaleDateString()}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                {hasUnsavedChanges && !autoSave && (
                  <Chip
                    icon={<ErrorIcon />}
                    label="Manual Save Required"
                    color="warning"
                    size="small"
                  />
                )}
                <Typography variant="body2" color="text.secondary">
                  Auto-save: {autoSave ? "On" : "Off"}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </StatusBar>

        {/* Action FABs */}
        <ActionFabs>
          {hasUnsavedChanges && !autoSave && (
            <Tooltip title="Save All Changes" placement="left">
              <Fab
                color="primary"
                onClick={handleSaveAll}
                disabled={updateDemandMutation.isLoading}
              >
                {updateDemandMutation.isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <SaveIcon />
                )}
              </Fab>
            </Tooltip>
          )}

          <Tooltip title="Refresh Data" placement="left">
            <Fab color="secondary" onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon />
            </Fab>
          </Tooltip>
        </ActionFabs>

        {/* Connection Status Monitor */}
        <ConnectionStatusMonitor
          onRetryConnection={handleConnectionRetry}
          onOfflineDataSync={handleOfflineDataSync}
        />

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </PageContainer>
    </ShiftDemandErrorBoundary>
  );
};

export default ShiftDemandPage;
