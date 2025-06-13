/**
 * Shift Demand Templates Management Page
 *
 * Provides interface for creating and managing shift demand templates
 * using our new simplified template structure.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Container,
} from "@mui/material";
import { Add, ViewList, Settings } from "@mui/icons-material";
import { useTranslation } from "../../../../i18n/client";
import { useTeam } from "@/context/TeamContext";
import {
  ShiftDemandTemplateDTO,
  TemplateListItem,
  ShiftDemandTemplateCreateDTO,
} from "../../../../../types/shift-demand-template";
import { ShiftDemandTemplateApi } from "../../../../lib/api/shiftDemandTemplateApi";

// Import our new template components
import { CreateTemplateForm } from "../../../../../components/templates/CreateTemplateForm";
import { CreateTemplateFromDemandsForm } from "../../../../../components/templates/CreateTemplateFromDemandsForm";
import TemplateManagementWindow from "../../../../../components/shiftDemand/templates/TemplateManagementWindow";

interface PageProps {
  params: { lng: string };
}

enum ViewMode {
  LIST = "list",
  CREATE_BASIC = "create_basic",
  CREATE_FROM_DEMANDS = "create_from_demands",
  MANAGE = "manage",
}

export default function TemplatesPage({ params: { lng } }: PageProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const { selectedTeam } = useTeam();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Load templates and shifts on mount
  useEffect(() => {
    if (selectedTeam?.team.id) {
      loadTemplates();
      loadShifts();
    }
  }, [selectedTeam?.team.id]);

  const loadShifts = async () => {
    if (!selectedTeam?.team.id) return;

    try {
      // TODO: Add proper shifts API call when available
      // For now we'll use empty array
      setShifts([]);
    } catch (err) {
      console.error("Failed to load shifts:", err);
    }
  };

  const loadTemplates = async () => {
    if (!selectedTeam?.team.id) return;

    setLoading(true);
    setError("");
    try {
      const templatesData = await ShiftDemandTemplateApi.getTemplates(
        selectedTeam.team.id
      );

      // Convert to list items
      const listItems: TemplateListItem[] = templatesData.map(
        (template: ShiftDemandTemplateDTO) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          templateType: template.templateType as any,
          createdBy: template.createdBy,
          createdAt: new Date(template.createdAt * 1000) as any,
          updatedAt: new Date(template.updatedAt * 1000) as any,
          totalDemands: template.weeksData.reduce(
            (total: number, week: any) => total + week.demands.length,
            0
          ),
        })
      );

      setTemplates(listItems);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setError(
        err instanceof Error ? err.message : t("error_loading_templates")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBasicTemplate = async (
    templateData: ShiftDemandTemplateCreateDTO
  ) => {
    if (!selectedTeam?.team.id) return;

    try {
      setLoading(true);
      const newTemplate = await ShiftDemandTemplateApi.createTemplate(
        selectedTeam.team.id,
        templateData
      );

      setSuccessMessage(t("template_created_successfully"));
      setViewMode(ViewMode.LIST);

      // Refresh templates list
      await loadTemplates();
    } catch (err) {
      console.error("Failed to create template:", err);
      setError(
        err instanceof Error ? err.message : t("error_creating_template")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromDemands = async (data: any) => {
    if (!selectedTeam?.team.id) return;

    try {
      setLoading(true);
      const newTemplate =
        await ShiftDemandTemplateApi.createTemplateFromDateRange(
          selectedTeam.team.id,
          data
        );

      setSuccessMessage(t("template_created_from_demands_successfully"));
      setViewMode(ViewMode.LIST);

      // Refresh templates list
      await loadTemplates();
    } catch (err) {
      console.error("Failed to create template from demands:", err);
      setError(
        err instanceof Error ? err.message : t("error_creating_template")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!selectedTeam?.team.id) return;

    try {
      await ShiftDemandTemplateApi.deleteTemplate(
        templateId,
        selectedTeam.team.id
      );
      setSuccessMessage(t("template_deleted_successfully"));
      await loadTemplates();
    } catch (err) {
      console.error("Failed to delete template:", err);
      setError(
        err instanceof Error ? err.message : t("error_deleting_template")
      );
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  if (!selectedTeam) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!selectedTeam.team) {
    return (
      <Container>
        <Alert severity="error">{t("no_team_selected")}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t("shift_demand_templates")}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {t("templates_description")}
          </Typography>
        </Box>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" onClose={clearMessages} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" onClose={clearMessages} sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {/* Main Content */}
        {viewMode === ViewMode.LIST && (
          <Box>
            {/* Action Buttons */}
            <Box mb={3} display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setViewMode(ViewMode.CREATE_BASIC)}
              >
                {t("create_new_template")}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ViewList />}
                onClick={() => setViewMode(ViewMode.CREATE_FROM_DEMANDS)}
              >
                {t("create_from_existing_demands")}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setViewMode(ViewMode.MANAGE)}
                disabled={templates.length === 0}
              >
                {t("manage_templates")}
              </Button>
            </Box>

            {/* Templates List */}
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" align="center" color="textSecondary">
                    {t("no_templates_found")}
                  </Typography>
                  <Typography
                    variant="body2"
                    align="center"
                    color="textSecondary"
                    sx={{ mt: 1 }}
                  >
                    {t("create_first_template_prompt")}
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Box
                display="grid"
                gap={2}
                gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
              >
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {template.name}
                      </Typography>
                      {template.description && (
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          gutterBottom
                        >
                          {template.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="textSecondary">
                        {t("template_type")}: {template.templateType}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {t("total_demands")}: {template.totalDemands}
                      </Typography>
                      <Box mt={2}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setViewMode(ViewMode.MANAGE)}
                        >
                          {t("manage")}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {viewMode === ViewMode.CREATE_BASIC && (
          <Box>
            <Button onClick={() => setViewMode(ViewMode.LIST)} sx={{ mb: 2 }}>
              ← {t("back_to_list")}
            </Button>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {t("create_new_template")}
                </Typography>
                <CreateTemplateForm
                  onSubmit={handleCreateBasicTemplate}
                  onCancel={() => setViewMode(ViewMode.LIST)}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </Box>
        )}

        {viewMode === ViewMode.CREATE_FROM_DEMANDS && (
          <Box>
            <Button onClick={() => setViewMode(ViewMode.LIST)} sx={{ mb: 2 }}>
              ← {t("back_to_list")}
            </Button>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {t("create_template_from_demands")}
                </Typography>
                <CreateTemplateFromDemandsForm
                  onSubmit={handleCreateFromDemands}
                  onCancel={() => setViewMode(ViewMode.LIST)}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Template Management Window */}
        {selectedTeam?.team?.id && (
          <TemplateManagementWindow
            lng={lng}
            open={viewMode === ViewMode.MANAGE}
            onClose={() => setViewMode(ViewMode.LIST)}
            teamId={selectedTeam.team.id}
            shifts={shifts}
            currentPeriod={{
              start: new Date(),
              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            }}
          />
        )}
      </Box>
    </Container>
  );
}
