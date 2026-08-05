'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../app/i18n/client';
import { toast } from 'sonner';
import { TeamWithMembership } from '../../types/team';
import { ShiftT } from '../../types/shift';
import {
  ScheduleTemplateDTO,
  ScheduleTemplateWeekDataDTO,
  ApplyScheduleTemplateToDateRangeDTO,
  ScheduleTemplateApplicationResult,
  TemplateType,
} from '../../types/schedule-template';
import { TemplateListSidebar } from './TemplateListSidebar';
import { TemplateEditor } from './TemplateEditor';
import { TemplateApplyDialog } from './TemplateApplyDialog';
import { TemplateCreateDialog } from './TemplateCreateDialog';
import {
  useGetScheduleTemplates,
  useCreateScheduleTemplate,
  useUpdateScheduleTemplate,
  useDeleteScheduleTemplate,
  useApplyScheduleTemplateToDateRange,
} from '../../hooks/useScheduleTemplate';
import { useGetShifts } from '../../hooks/useShift';

interface ScheduleTemplatesPageProps {
  lng: string;
  teamWithMembership: TeamWithMembership;
}

export function ScheduleTemplatesPage({ lng, teamWithMembership }: ScheduleTemplatesPageProps) {
  const { t } = useTranslation(lng, 'schedule-templates');
  const teamId = teamWithMembership.team.id;

  const [templates, setTemplates] = useState<ScheduleTemplateDTO[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplateDTO | null>(null);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const getTemplates = useGetScheduleTemplates();
  const createTemplate = useCreateScheduleTemplate();
  const updateTemplate = useUpdateScheduleTemplate();
  const deleteTemplate = useDeleteScheduleTemplate();
  const applyToRange = useApplyScheduleTemplateToDateRange();
  const getShifts = useGetShifts();

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTemplates(teamId);
      setTemplates(data);
    } catch {
      toast.error(t('template_application_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [getTemplates, teamId, t]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    getShifts(teamId)
      .then(setShifts)
      .catch(() => {});
  }, [getShifts, teamId]);

  const handleSelectTemplate = (template: ScheduleTemplateDTO) => {
    setSelectedTemplate(template);
  };

  const handleCreate = () => {
    setDialogMode('create');
    setEditTemplateId(null);
    setDialogOpen(true);
  };

  const handleEdit = () => {
    setDialogMode('edit');
    setEditTemplateId(selectedTemplate?.id ?? null);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (
    name: string,
    templateType: TemplateType,
    description?: string,
  ) => {
    if (dialogMode === 'create') {
      try {
        const created = await createTemplate(teamId, {
          name,
          description,
          templateType,
        });
        setTemplates((prev) => [...prev, created]);
        setSelectedTemplate(created);
        setDialogOpen(false);
        toast.success(t('template_applied_successfully'));
      } catch {
        toast.error(t('template_application_failed'));
      }
    } else {
      if (!editTemplateId) return;
      try {
        const updated = await updateTemplate(editTemplateId, teamId, {
          name,
          description,
          templateType,
        });
        setTemplates((prev) => prev.map((tp) => (tp.id === updated.id ? updated : tp)));
        setSelectedTemplate(updated);
        setDialogOpen(false);
        toast.success(t('template_applied_successfully'));
      } catch {
        toast.error(t('template_application_failed'));
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    try {
      await deleteTemplate(selectedTemplate.id, teamId);
      setTemplates((prev) => prev.filter((tp) => tp.id !== selectedTemplate.id));
      setSelectedTemplate(null);
      toast.success(t('template_applied_successfully'));
    } catch {
      toast.error(t('template_application_failed'));
    }
  };

  const handleTemplateChange = useCallback(
    async (weeksData: ScheduleTemplateWeekDataDTO[]) => {
      if (!selectedTemplate) return;
      try {
        const updated = await updateTemplate(selectedTemplate.id, teamId, { weeksData });
        setTemplates((prev) => prev.map((tp) => (tp.id === updated.id ? updated : tp)));
        setSelectedTemplate(updated);
      } catch {
        toast.error(t('template_application_failed'));
      }
    },
    [selectedTemplate, teamId, updateTemplate, t],
  );

  const handleApply = async (request: ApplyScheduleTemplateToDateRangeDTO) => {
    if (!selectedTemplate) throw new Error('No template selected');
    const result = await applyToRange(selectedTemplate.id, teamId, {
      ...request,
      templateId: selectedTemplate.id,
    });
    return result;
  };

  const handleApplyComplete = (result: ScheduleTemplateApplicationResult) => {
    setIsApplyOpen(false);
    toast.success(result.message || t('template_applied_successfully'));
  };

  const editingTemplate =
    dialogMode === 'edit' && editTemplateId
      ? (templates.find((tp) => tp.id === editTemplateId) ?? null)
      : null;

  return (
    <div className="flex h-full">
      {sidebarVisible && (
        <TemplateListSidebar
          lng={lng}
          templates={templates}
          selectedTemplateId={selectedTemplate?.id ?? null}
          isLoading={isLoading}
          onSelect={handleSelectTemplate}
          onCreate={handleCreate}
          onToggleSidebar={() => setSidebarVisible(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TemplateEditor
          lng={lng}
          template={selectedTemplate}
          shifts={shifts}
          team={teamWithMembership.team}
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible(true)}
          onApply={() => setIsApplyOpen(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTemplateChange={handleTemplateChange}
        />
      </div>

      <TemplateCreateDialog
        lng={lng}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        mode={dialogMode}
        initialName={editingTemplate?.name ?? ''}
        initialDescription={editingTemplate?.description ?? ''}
        initialTemplateType={editingTemplate?.templateType ?? TemplateType.STANDARD}
      />

      {selectedTemplate && (
        <TemplateApplyDialog
          lng={lng}
          open={isApplyOpen}
          onClose={() => setIsApplyOpen(false)}
          template={selectedTemplate}
          teamId={teamId}
          onApply={handleApply}
          onComplete={handleApplyComplete}
        />
      )}
    </div>
  );
}
