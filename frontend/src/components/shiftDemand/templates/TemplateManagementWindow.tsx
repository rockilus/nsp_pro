/**
 * Template Management Window - Full-screen modal for managing shift demand templates
 *
 * Main container for the template management interface with:
 * - Sidebar template list
 * - Main content area for viewing/editing templates
 * - Modal dialogs for creation and application
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Tooltip,
} from "@mui/material";
import { Close, Menu, MenuOpen } from "@mui/icons-material";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT } from "../../../types/shift";
import {
  ShiftDemandTemplateDTO,
  TemplateViewMode,
  TemplateListItem,
  ShiftDemandTemplateCreateDTO,
  TemplateType,
  TemplateWeekDataDTO,
  ApplyDemandsToTemplateWeekDTO,
  ApplyTemplateToDateRangeDTO,
  TemplateApplicationResult,
} from "../../../types/shift-demand-template";
import { TemplateUtils } from "../../../app/lib/api/shiftDemandTemplateApi";
import {
  useGetTemplates,
  useGetTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useApplyTemplateToDateRange,
  useApplyDemandsToTemplateWeek,
} from "../../../hooks/useShiftDemandTemplate";

// Import template components
import { TemplateList } from "./TemplateList";
import { TemplateViewer } from "./TemplateViewer";
import { TemplateCreationDialog } from "./TemplateCreationDialog";
import { TemplateApplicationDialog } from "./TemplateApplicationDialog";
import TemplateApplicationToRangeDialog from "./TemplateApplicationToRangeDialog";

// Import CSS
import "./TemplateManagementWindow.css";

interface TemplateManagementWindowProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  teamId: string;
  shifts: ShiftT[];
  currentPeriod: {
    start: any; // Dayjs
    end: any; // Dayjs
  };
}

export default function TemplateManagementWindow({
  lng,
  open,
  onClose,
  teamId,
  shifts,
  currentPeriod,
}: TemplateManagementWindowProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Initialize hooks
  const getTemplates = useGetTemplates();
  const getTemplate = useGetTemplate();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const applyTemplateToDateRange = useApplyTemplateToDateRange();
  const applyDemandsToTemplateWeek = useApplyDemandsToTemplateWeek();

  // State management
  const [selectedTemplate, setSelectedTemplate] =
    useState<ShiftDemandTemplateDTO | null>(null);
  const [viewMode, setViewMode] = useState<TemplateViewMode>("list");
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [showRangeApplicationDialog, setShowRangeApplicationDialog] =
    useState(false);
  const [templateToApplyId, setTemplateToApplyId] = useState<string | null>(
    null
  );
  const [templateToApply, setTemplateToApply] =
    useState<ShiftDemandTemplateDTO | null>(null);

  // Template list state
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);

  // Sidebar visibility state
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Error and success notifications
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Template update state
  const [templateUpdateLoading, setTemplateUpdateLoading] = useState(false);

  // Auto-hide sidebar on mobile when template is selected
  useEffect(() => {
    if (isMobile && selectedTemplate && viewMode !== "list") {
      setSidebarVisible(false);
    }
  }, [isMobile, selectedTemplate, viewMode]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplate(null);
      setViewMode("list");
      setShowCreationDialog(false);
      setShowApplicationDialog(false);
      setTemplateToApplyId(null);
      setError(null);
      setSuccessMessage(null);
      setSidebarVisible(true); // Reset sidebar visibility
    }
  }, [open]);

  // Handlers
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };
  const handleTemplateSelect = useCallback(
    async (template: TemplateListItem) => {
      try {
        // Load full template data from API using hook
        const fullTemplate = await getTemplate(template.id, teamId);
        setSelectedTemplate(fullTemplate);
        setViewMode("view");

        // Auto-hide sidebar on mobile after selection
        if (isMobile) {
          setSidebarVisible(false);
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : t("error_loading_template")
        );
      }
    },
    [getTemplate, teamId, isMobile, t]
  );

  const handleTemplateApply = async (templateId?: string) => {
    const idToUse = templateId || selectedTemplate?.id;
    if (idToUse) {
      try {
        // Use the selected template if it's the same one, otherwise fetch it
        let templateToUse = selectedTemplate;
        if (!templateToUse || templateToUse.id !== idToUse) {
          templateToUse = await getTemplate(idToUse, teamId);
        }

        setTemplateToApply(templateToUse);
        setTemplateToApplyId(idToUse);
        setShowRangeApplicationDialog(true);
      } catch (error) {
        console.error("Failed to fetch template for application:", error);
        setError(t("template_fetch_failed"));
      }
    }
  };

  const handleTemplateDelete = useCallback(
    (templateId: string) => {
      setSelectedTemplate(null);
      setViewMode("list");
      setSuccessMessage(t("template_deleted_successfully"));
      // Trigger template list refresh by updating templates state
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    },
    [t]
  );

  const handleTemplateCreated = async (
    templateData: ShiftDemandTemplateCreateDTO
  ) => {
    try {
      // Create the template via hook
      const newTemplate = await createTemplate(teamId, templateData);

      // Update UI state
      setShowCreationDialog(false);
      setSelectedTemplate(newTemplate);
      setViewMode("view");
      setSuccessMessage(t("template_created_successfully"));

      // Add to templates list for immediate UI update
      const newTemplateListItem: TemplateListItem = {
        id: newTemplate.id,
        name: newTemplate.name,
        description: newTemplate.description,
        templateType: newTemplate.templateType as TemplateType,
        createdBy: newTemplate.createdBy,
        createdAt: dayjs(newTemplate.createdAt * 1000), // Convert timestamp
        updatedAt: dayjs(newTemplate.updatedAt * 1000), // Convert timestamp
        totalDemands: 0, // Empty template starts with 0 demands
      };
      setTemplates((prev) => [...prev, newTemplateListItem]);

      // Auto-hide sidebar on mobile after creation
      if (isMobile) {
        setSidebarVisible(false);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("error_creating_template");
      setError(errorMessage);
    }
  };

  const handleTemplateApplied = () => {
    setShowApplicationDialog(false);
    setTemplateToApplyId(null);
    setSuccessMessage(t("template_applied_successfully"));
  };

  const handleRangeApplicationComplete = (
    result: TemplateApplicationResult
  ) => {
    setShowRangeApplicationDialog(false);
    setTemplateToApplyId(null);
    setTemplateToApply(null);
    setSuccessMessage(
      t("template_applied_successfully_with_counts", {
        created: result.demandsCreated,
        updated: result.demandsUpdated,
        deleted: result.demandsDeleted,
      })
    );
  };

  const handleRangeApplicationError = (error: string) => {
    setError(error);
  };

  const handleApplyTemplateToRange = async (
    request: ApplyTemplateToDateRangeDTO
  ): Promise<TemplateApplicationResult> => {
    if (!templateToApply) {
      throw new Error("No template selected for application");
    }

    try {
      return await applyTemplateToDateRange(
        templateToApply.id,
        teamId,
        request
      );
    } catch (error) {
      console.error("Failed to apply template to date range:", error);
      throw error;
    }
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setViewMode("list");
    // Show sidebar when going back to list on mobile
    if (isMobile) {
      setSidebarVisible(true);
    }
  };

  const handleCreateNew = useCallback(() => {
    setShowCreationDialog(true);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const handleCloseError = () => {
    setError(null);
  };

  const handleCloseSuccess = () => {
    setSuccessMessage(null);
  };

  const handleTemplatesLoaded = useCallback(
    (loadedTemplates: TemplateListItem[]) => {
      setTemplates(loadedTemplates);
    },
    []
  );

  const handleLoadTemplates = useCallback(async () => {
    if (!teamId) return;

    try {
      const templatesData = await getTemplates(teamId);

      // Convert to list items with calculated fields
      const listItems: TemplateListItem[] = templatesData.map(
        (template: ShiftDemandTemplateDTO) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          templateType: template.templateType as TemplateType,
          createdBy: template.createdBy,
          createdAt: dayjs(template.createdAt * 1000), // Convert timestamp to milliseconds
          updatedAt: dayjs(template.updatedAt * 1000), // Convert timestamp to milliseconds
          totalDemands: TemplateUtils.calculateTotalDemands(template),
        })
      );

      setTemplates(listItems);
    } catch (error) {
      console.error("Failed to load templates:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load templates"
      );
    }
  }, [teamId, getTemplates]);

  const handleDeleteTemplateRequest = useCallback(
    async (templateId: string, templateName: string) => {
      try {
        await deleteTemplate(templateId, teamId);
        handleTemplateDelete(templateId);
      } catch (error) {
        console.error("Failed to delete template:", error);
        setError(
          error instanceof Error ? error.message : "Failed to delete template"
        );
        throw error;
      }
    },
    [deleteTemplate, teamId, handleTemplateDelete]
  );

  // Centralized template update handlers
  const handleUpdateTemplate = async (
    updates: Partial<ShiftDemandTemplateDTO>
  ) => {
    if (!selectedTemplate) return;

    setTemplateUpdateLoading(true);
    try {
      const updatedTemplate = await updateTemplate(
        selectedTemplate.id,
        teamId,
        updates
      );

      // Update local state
      setSelectedTemplate(updatedTemplate);
      setSuccessMessage(t("template_updated_successfully"));
    } catch (error) {
      console.error("Failed to update template:", error);
      setError(
        error instanceof Error ? error.message : t("error_updating_template")
      );
      throw error; // Re-throw so child components can handle loading states
    } finally {
      setTemplateUpdateLoading(false);
    }
  };

  const handleAddWeek = async () => {
    if (!selectedTemplate) return;

    // Create new week data with empty demands
    const newWeekNumber = selectedTemplate.weeksData.length;
    const newWeekData: TemplateWeekDataDTO = {
      weekNumber: newWeekNumber,
      demands: [],
    };

    const updatedWeeksData = [...selectedTemplate.weeksData, newWeekData];
    await handleUpdateTemplate({ weeksData: updatedWeeksData });
  };

  const handleDeleteWeek = async (weekNumber: number) => {
    if (!selectedTemplate || selectedTemplate.weeksData.length <= 1) {
      throw new Error("Cannot delete the last week");
    }

    // Remove the week and renumber remaining weeks
    const updatedWeeksData = selectedTemplate.weeksData
      .filter((week) => week.weekNumber !== weekNumber)
      .map((week, index) => ({
        ...week,
        weekNumber: index, // Renumber weeks to be consecutive
      }));

    await handleUpdateTemplate({ weeksData: updatedWeeksData });
  };

  const handleUpdateTemplateType = async (templateType: TemplateType) => {
    if (!selectedTemplate) return;

    // For EVEN_ODD conversion, we need to handle week adjustment
    if (
      templateType === TemplateType.EVEN_ODD &&
      selectedTemplate.weeksData.length !== 2
    ) {
      let adjustedWeeksData: TemplateWeekDataDTO[];

      if (selectedTemplate.weeksData.length >= 2) {
        // Template has 2 or more weeks - keep only first 2
        adjustedWeeksData = selectedTemplate.weeksData
          .slice(0, 2)
          .map((week, index) => ({
            ...week,
            weekNumber: index, // Renumber to 0, 1
          }));
      } else {
        // Template has fewer than 2 weeks - use existing weeks and add empty ones
        adjustedWeeksData = [...selectedTemplate.weeksData];

        // Renumber existing weeks
        adjustedWeeksData.forEach((week, index) => {
          week.weekNumber = index;
        });
      }

      // Ensure we have exactly 2 weeks
      while (adjustedWeeksData.length < 2) {
        adjustedWeeksData.push({
          weekNumber: adjustedWeeksData.length,
          demands: [],
        });
      }

      await handleUpdateTemplate({
        templateType,
        weeksData: adjustedWeeksData,
      });
    } else {
      await handleUpdateTemplate({ templateType });
    }
  };

  const handleUpdateTemplateMetadata = async (updates: {
    name?: string;
    description?: string;
  }) => {
    await handleUpdateTemplate(updates);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId, teamId);
      // The onDelete callback will handle UI updates
    } catch (error) {
      console.error("Failed to delete template:", error);
      setError(
        error instanceof Error ? error.message : t("error_deleting_template")
      );
      throw error;
    }
  };

  const handleApplyDemandsToTemplateWeek = async (
    sourceWeekStartDate: number,
    targetWeekNumber: number
  ) => {
    if (!selectedTemplate) return;

    setTemplateUpdateLoading(true);
    try {
      const request: ApplyDemandsToTemplateWeekDTO = {
        templateId: selectedTemplate.id,
        sourceWeekStartDate: sourceWeekStartDate,
        targetWeekNumber: targetWeekNumber,
      };

      const updatedTemplate = await applyDemandsToTemplateWeek(
        selectedTemplate.id,
        teamId,
        request
      );

      // Update local state
      setSelectedTemplate(updatedTemplate);
      setSuccessMessage(t("demands_applied_successfully"));
    } catch (error) {
      console.error("Failed to apply demands to template week:", error);
      setError(
        error instanceof Error
          ? error.message
          : t("failed_to_apply_demands_to_template_week")
      );
      throw error; // Re-throw so child components can handle loading states
    } finally {
      setTemplateUpdateLoading(false);
    }
  };

  // Render main content based on view mode
  const renderMainContent = () => {
    if (viewMode === "view" && selectedTemplate) {
      return (
        <TemplateViewer
          lng={lng}
          template={selectedTemplate}
          shifts={shifts}
          teamId={teamId}
          onApply={() => handleTemplateApply()}
          onDelete={handleBack} // This will go back to list after delete
          onError={handleError}
          onUpdateTemplate={handleUpdateTemplate}
          onAddWeek={handleAddWeek}
          onDeleteWeek={handleDeleteWeek}
          onUpdateTemplateType={handleUpdateTemplateType}
          onUpdateTemplateMetadata={handleUpdateTemplateMetadata}
          onDeleteTemplate={handleDeleteTemplate}
          onApplyDemandsToTemplateWeek={handleApplyDemandsToTemplateWeek}
          templateUpdateLoading={templateUpdateLoading}
        />
      );
    }

    // Default: show empty state
    return (
      <Box className="template-management-empty">
        <Typography variant="h6" color="textSecondary" gutterBottom>
          {t("select_template_to_view")}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t("select_template_description")}
        </Typography>
      </Box>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        fullWidth
        fullScreen
        PaperProps={{
          sx: {
            margin: 0,
            maxHeight: "100vh",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
        data-testid="template-management-window"
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            zIndex: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip
              title={sidebarVisible ? t("hide_sidebar") : t("show_sidebar")}
            >
              <IconButton
                onClick={toggleSidebar}
                sx={{ color: "text.secondary" }}
                aria-label={
                  sidebarVisible ? t("hide_sidebar") : t("show_sidebar")
                }
              >
                {sidebarVisible ? <MenuOpen /> : <Menu />}
              </IconButton>
            </Tooltip>
            <Typography variant="h6" component="h2">
              {t("template_management")}
            </Typography>
          </Box>
          <IconButton
            data-testid="template-management-close-button"
            onClick={onClose}
            sx={{ color: "text.secondary" }}
            aria-label={t("close")}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Main Content */}
        <DialogContent
          sx={{
            flex: 1,
            display: "flex",
            p: 0,
            overflow: "hidden",
          }}
          className="template-management-content"
        >
          {/* Sidebar - Template List */}
          {sidebarVisible && (
            <Box className="template-management-sidebar">
              <TemplateList
                lng={lng}
                teamId={teamId}
                templates={templates}
                selectedTemplateId={selectedTemplate?.id || null}
                onSelectTemplate={handleTemplateSelect}
                onCreateTemplate={handleCreateNew}
                onDeleteTemplate={handleTemplateDelete}
                onError={handleError}
                onTemplatesLoaded={handleTemplatesLoaded}
                onLoadTemplates={handleLoadTemplates}
                onDeleteTemplateRequest={handleDeleteTemplateRequest}
              />
            </Box>
          )}

          {/* Main Content Area */}
          <Box
            className="template-management-main"
            sx={{
              flex: 1,
              ...(sidebarVisible ? {} : { width: "100%" }),
            }}
          >
            {renderMainContent()}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Template Creation Dialog */}
      <TemplateCreationDialog
        lng={lng}
        open={showCreationDialog}
        onClose={() => setShowCreationDialog(false)}
        teamId={teamId}
        shifts={shifts}
        currentPeriod={currentPeriod}
        onTemplateCreated={handleTemplateCreated}
        onError={handleError}
      />

      {/* Template Application Dialog */}
      {templateToApplyId && (
        <TemplateApplicationDialog
          lng={lng}
          open={showApplicationDialog}
          onClose={() => {
            setShowApplicationDialog(false);
            setTemplateToApplyId(null);
          }}
          templateId={templateToApplyId}
          currentPeriod={currentPeriod}
          onApplicationComplete={handleTemplateApplied}
          onError={handleError}
        />
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSuccess}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Template Range Application Dialog */}
      {templateToApply && (
        <TemplateApplicationToRangeDialog
          lng={lng}
          open={showRangeApplicationDialog}
          onClose={() => {
            setShowRangeApplicationDialog(false);
            setTemplateToApplyId(null);
            setTemplateToApply(null);
          }}
          template={templateToApply}
          teamId={teamId}
          onApplicationComplete={handleRangeApplicationComplete}
          onError={handleRangeApplicationError}
          onApplyTemplate={handleApplyTemplateToRange}
        />
      )}
    </>
  );
}
