/**
 * Template Management Window - Full-screen modal for managing shift demand templates
 *
 * Main container for the template management interface with:
 * - Sidebar template list
 * - Main content area for viewing/editing templates
 * - Modal dialogs for creation and application
 */

import React, { useState, useEffect } from "react";
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
  ShiftDemandTemplateUpdateDTO,
  TemplateType,
} from "../../../types/shift-demand-template";
import { ShiftDemandTemplateApi } from "../../../app/lib/api/shiftDemandTemplateApi";

// Import template components
import { TemplateList } from "./TemplateList";
import { TemplateViewer } from "./TemplateViewer";
import { TemplateEditor } from "./TemplateEditor";
import { TemplateCreationDialog } from "./TemplateCreationDialog";
import { TemplateApplicationDialog } from "./TemplateApplicationDialog";

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

  // State management
  const [selectedTemplate, setSelectedTemplate] =
    useState<ShiftDemandTemplateDTO | null>(null);
  const [viewMode, setViewMode] = useState<TemplateViewMode>("list");
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [templateToApplyId, setTemplateToApplyId] = useState<string | null>(
    null
  );

  // Template list state
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);

  // Sidebar visibility state
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Error and success notifications
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  const handleTemplateSelect = async (template: TemplateListItem) => {
    try {
      // Load full template data from API
      const fullTemplate = await ShiftDemandTemplateApi.getTemplate(
        template.id,
        teamId
      );
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
  };

  const handleTemplateEdit = () => {
    if (selectedTemplate) {
      setViewMode("edit");
    }
  };

  const handleTemplateApply = (templateId?: string) => {
    const idToUse = templateId || selectedTemplate?.id;
    if (idToUse) {
      setTemplateToApplyId(idToUse);
      setShowApplicationDialog(true);
    }
  };

  const handleTemplateDelete = (templateId: string) => {
    setSelectedTemplate(null);
    setViewMode("list");
    setSuccessMessage(t("template_deleted_successfully"));
    // Trigger template list refresh by updating templates state
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const handleTemplateUpdated = async (
    updateData: ShiftDemandTemplateUpdateDTO
  ) => {
    if (!selectedTemplate) return;

    try {
      const updatedTemplate = await ShiftDemandTemplateApi.updateTemplate(
        selectedTemplate.id,
        teamId,
        updateData
      );
      setSelectedTemplate(updatedTemplate);
      setViewMode("view");
      setSuccessMessage(t("template_updated_successfully"));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t("error_updating_template")
      );
    }
  };

  const handleTemplateCreated = async (
    templateData: ShiftDemandTemplateCreateDTO
  ) => {
    try {
      // Create the template via API client
      const newTemplate = await ShiftDemandTemplateApi.createTemplate(
        teamId,
        templateData
      );

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

  const handleBack = () => {
    if (viewMode === "edit") {
      setViewMode("view");
    } else {
      setSelectedTemplate(null);
      setViewMode("list");
      // Show sidebar when going back to list on mobile
      if (isMobile) {
        setSidebarVisible(true);
      }
    }
  };

  const handleCreateNew = () => {
    setShowCreationDialog(true);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleCloseError = () => {
    setError(null);
  };

  const handleCloseSuccess = () => {
    setSuccessMessage(null);
  };

  const handleTemplatesLoaded = (loadedTemplates: TemplateListItem[]) => {
    setTemplates(loadedTemplates);
  };

  // Render main content based on view mode
  const renderMainContent = () => {
    if (viewMode === "edit" && selectedTemplate) {
      return (
        <TemplateEditor
          lng={lng}
          template={selectedTemplate}
          shifts={shifts}
          onSave={handleTemplateUpdated}
          onCancel={handleBack}
          onError={handleError}
        />
      );
    }

    if (viewMode === "view" && selectedTemplate) {
      return (
        <TemplateViewer
          lng={lng}
          template={selectedTemplate}
          shifts={shifts}
          onEdit={handleTemplateEdit}
          onApply={() => handleTemplateApply()}
          onDelete={handleBack} // This will go back to list after delete
          onBack={handleBack}
          onError={handleError}
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
    </>
  );
}
