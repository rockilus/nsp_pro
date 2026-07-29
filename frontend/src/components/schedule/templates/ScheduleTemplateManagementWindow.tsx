import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import { Close, Menu, MenuOpen } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from '../../../app/i18n/client';
import { ShiftT } from '../../../types/shift';
import { WorkerT } from '../../../types/worker';
import {
  AssignmentTemplateDTO,
  TemplateType,
  TemplateViewMode,
  AssignmentTemplateCreateDTO,
  AssignmentTemplateListItem,
  ApplyAssignmentTemplateToDateRangeDTO,
  AssignmentTemplateApplicationResult,
} from '../../../types/assignment-template';
import {
  useGetAssignmentTemplates,
  useGetAssignmentTemplate,
  useCreateAssignmentTemplate,
  useUpdateAssignmentTemplate,
  useDeleteAssignmentTemplate,
  useApplyAssignmentTemplateToDateRange,
} from '../../../hooks/useAssignmentTemplate';
import { ScheduleTemplateList } from './ScheduleTemplateList';
import { ScheduleTemplateViewer } from './ScheduleTemplateViewer';
import { ScheduleTemplateCreationDialog } from './ScheduleTemplateCreationDialog';
import { ScheduleTemplateApplicationToRangeDialog } from './ScheduleTemplateApplicationToRangeDialog';

interface ScheduleTemplateManagementWindowProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  teamId: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  onTemplateApplied?: () => void;
}

export function ScheduleTemplateManagementWindow({
  lng,
  open,
  onClose,
  teamId,
  workers,
  shifts,
  onTemplateApplied,
}: ScheduleTemplateManagementWindowProps) {
  const { t } = useTranslation(lng, 'schedule-page');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getTemplates = useGetAssignmentTemplates();
  const getTemplate = useGetAssignmentTemplate();
  const createTemplate = useCreateAssignmentTemplate();
  const updateTemplate = useUpdateAssignmentTemplate();
  const deleteTemplate = useDeleteAssignmentTemplate();
  const applyTemplateToDateRange = useApplyAssignmentTemplateToDateRange();

  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplateDTO | null>(null);
  const [viewMode, setViewMode] = useState<TemplateViewMode>('list');
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [templateToApply, setTemplateToApply] = useState<AssignmentTemplateDTO | null>(null);
  const [templates, setTemplates] = useState<AssignmentTemplateListItem[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [templateUpdateLoading, setTemplateUpdateLoading] = useState(false);

  useEffect(() => {
    if (isMobile && selectedTemplate && viewMode !== 'list') {
      setSidebarVisible(false);
    }
  }, [isMobile, selectedTemplate, viewMode]);

  useEffect(() => {
    if (!open) {
      setSelectedTemplate(null);
      setViewMode('list');
      setShowCreationDialog(false);
      setError(null);
      setSuccessMessage(null);
      setSidebarVisible(true);
    }
  }, [open]);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const handleTemplateSelect = useCallback(
    async (template: AssignmentTemplateListItem) => {
      try {
        const fullTemplate = await getTemplate(template.id, teamId);
        setSelectedTemplate(fullTemplate);
        setViewMode('view');
        if (isMobile) setSidebarVisible(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error_loading_template'));
      }
    },
    [getTemplate, teamId, isMobile, t],
  );

  const handleTemplateApply = async (templateId?: string) => {
    const idToUse = templateId || selectedTemplate?.id;
    if (!idToUse) return;
    try {
      let templateToUse = selectedTemplate;
      if (!templateToUse || templateToUse.id !== idToUse) {
        templateToUse = await getTemplate(idToUse, teamId);
      }
      setTemplateToApply(templateToUse);
      setShowApplyDialog(true);
    } catch (err) {
      setError(t('template_fetch_failed'));
    }
  };

  const handleTemplateCreated = async (templateData: AssignmentTemplateCreateDTO) => {
    try {
      const newTemplate = await createTemplate(teamId, templateData);
      setShowCreationDialog(false);
      setSelectedTemplate(newTemplate);
      setViewMode('view');
      setSuccessMessage(t('template_created_successfully'));

      const listItem: AssignmentTemplateListItem = {
        id: newTemplate.id,
        name: newTemplate.name,
        description: newTemplate.description,
        templateType: newTemplate.templateType as TemplateType,
        createdBy: newTemplate.createdBy,
        createdAt: dayjs(newTemplate.createdAt * 1000),
        updatedAt: dayjs(newTemplate.updatedAt * 1000),
        totalEntries: 0,
      };
      setTemplates((prev) => [...prev, listItem]);

      if (isMobile) setSidebarVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_creating_template'));
    }
  };

  const handleApplyComplete = (result: AssignmentTemplateApplicationResult) => {
    setShowApplyDialog(false);
    setTemplateToApply(null);
    setSuccessMessage(
      t('template_applied_with_counts', {
        created: result.assignmentsCreated,
        deleted: result.assignmentsDeleted,
      }),
    );
    onTemplateApplied?.();
  };

  const handleApplyError = (errorMsg: string) => setError(errorMsg);

  const handleBack = () => {
    setSelectedTemplate(null);
    setViewMode('list');
    if (isMobile) setSidebarVisible(true);
  };

  const handleUpdateTemplate = async (updates: Partial<AssignmentTemplateDTO>) => {
    if (!selectedTemplate) return;
    setTemplateUpdateLoading(true);
    try {
      const updated = await updateTemplate(selectedTemplate.id, teamId, updates);
      setSelectedTemplate(updated);
      setSuccessMessage(t('template_updated_successfully'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_updating_template'));
      throw err;
    } finally {
      setTemplateUpdateLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId, teamId);
      setSelectedTemplate(null);
      setViewMode('list');
      setSuccessMessage(t('template_deleted_successfully'));
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_deleting_template'));
    }
  };

  const handleAddWeek = async () => {
    if (!selectedTemplate) return;
    const newWeek = {
      weekNumber: selectedTemplate.weeksData.length,
      entries: [],
    };
    const updatedWeeksData = [...selectedTemplate.weeksData, newWeek];
    await handleUpdateTemplate({ weeksData: updatedWeeksData });
  };

  const handleDeleteWeek = async (weekNumber: number) => {
    if (!selectedTemplate || selectedTemplate.weeksData.length <= 1) return;
    const updatedWeeksData = selectedTemplate.weeksData
      .filter((w) => w.weekNumber !== weekNumber)
      .map((w, idx) => ({ ...w, weekNumber: idx }));
    await handleUpdateTemplate({ weeksData: updatedWeeksData });
  };

  const handleApplyTemplateToRange = async (
    request: ApplyAssignmentTemplateToDateRangeDTO,
  ): Promise<AssignmentTemplateApplicationResult> => {
    if (!templateToApply) throw new Error('No template selected');
    return applyTemplateToDateRange(templateToApply.id, teamId, request);
  };

  const handleTemplatesLoaded = useCallback(
    (loaded: AssignmentTemplateListItem[]) => setTemplates(loaded),
    [],
  );

  const handleLoadTemplates = useCallback(async () => {
    if (!teamId) return;
    try {
      const data = await getTemplates(teamId);
      const items: AssignmentTemplateListItem[] = data.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        templateType: t.templateType as TemplateType,
        createdBy: t.createdBy,
        createdAt: dayjs(t.createdAt * 1000),
        updatedAt: dayjs(t.updatedAt * 1000),
        totalEntries: t.weeksData.reduce(
          (sum, w) => sum + w.entries.reduce((s, e) => s + e.workerIds.length, 0),
          0,
        ),
      }));
      setTemplates(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }, [teamId, getTemplates]);

  const handleDeleteTemplateRequest = useCallback(
    async (templateId: string) => {
      await deleteTemplate(templateId, teamId);
      setSelectedTemplate(null);
      setViewMode('list');
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    },
    [deleteTemplate, teamId],
  );

  const renderMainContent = () => {
    if (viewMode === 'view' && selectedTemplate) {
      return (
        <ScheduleTemplateViewer
          lng={lng}
          template={selectedTemplate}
          workers={workers}
          shifts={shifts}
          teamId={teamId}
          onApply={handleTemplateApply}
          onDelete={handleBack}
          onError={setError}
          onUpdateTemplate={handleUpdateTemplate}
          onAddWeek={handleAddWeek}
          onDeleteWeek={handleDeleteWeek}
          onDeleteTemplate={handleDeleteTemplate}
          templateUpdateLoading={templateUpdateLoading}
        />
      );
    }

    return (
      <Box className="template-management-empty">
        <Typography variant="h6" color="textSecondary" gutterBottom>
          {t('select_template_to_view')}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('select_template_description')}
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
            maxHeight: '100vh',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        data-testid="schedule-template-management-window"
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={sidebarVisible ? t('hide_sidebar') : t('show_sidebar')}>
              <IconButton
                onClick={toggleSidebar}
                sx={{ color: 'text.secondary' }}
                aria-label={sidebarVisible ? t('hide_sidebar') : t('show_sidebar')}
              >
                {sidebarVisible ? <MenuOpen /> : <Menu />}
              </IconButton>
            </Tooltip>
            <Typography variant="h6" component="h2">
              {t('template_management')}
            </Typography>
          </Box>
          <IconButton
            data-testid="schedule-template-close-button"
            onClick={onClose}
            sx={{ color: 'text.secondary' }}
            aria-label={t('close')}
          >
            <Close />
          </IconButton>
        </Box>

        <DialogContent sx={{ flex: 1, display: 'flex', p: 0, overflow: 'hidden' }}>
          {sidebarVisible && (
            <Box className="template-management-sidebar">
              <ScheduleTemplateList
                lng={lng}
                teamId={teamId}
                templates={templates}
                selectedTemplateId={selectedTemplate?.id || null}
                onSelectTemplate={handleTemplateSelect}
                onApplyTemplate={handleTemplateApply}
                onCreateTemplate={() => setShowCreationDialog(true)}
                onDeleteTemplate={handleBack}
                onError={setError}
                onTemplatesLoaded={handleTemplatesLoaded}
                onLoadTemplates={handleLoadTemplates}
                onDeleteTemplateRequest={handleDeleteTemplateRequest}
              />
            </Box>
          )}

          <Box
            className="template-management-main"
            sx={{ flex: 1, ...(sidebarVisible ? {} : { width: '100%' }) }}
          >
            {renderMainContent()}
          </Box>
        </DialogContent>
      </Dialog>

      <ScheduleTemplateCreationDialog
        lng={lng}
        open={showCreationDialog}
        onClose={() => setShowCreationDialog(false)}
        onTemplateCreated={handleTemplateCreated}
        onError={setError}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      {templateToApply && (
        <ScheduleTemplateApplicationToRangeDialog
          lng={lng}
          open={showApplyDialog}
          onClose={() => {
            setShowApplyDialog(false);
            setTemplateToApply(null);
          }}
          template={templateToApply}
          teamId={teamId}
          shifts={shifts}
          onApplicationComplete={handleApplyComplete}
          onError={handleApplyError}
          onApplyTemplate={handleApplyTemplateToRange}
        />
      )}
    </>
  );
}
