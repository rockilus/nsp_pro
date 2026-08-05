'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../app/i18n/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TeamWithMembership } from '../../types/team';
import { ShiftT } from '../../types/shift';
import {
  ScheduleTemplateDTO,
  ScheduleTemplateUpdateDTO,
  ApplyScheduleTemplateToDateRangeDTO,
  ScheduleTemplateApplicationResult,
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const handleCreate = async (name: string, description?: string) => {
    try {
      const created = await createTemplate(teamId, { name, description });
      setTemplates((prev) => [...prev, created]);
      setSelectedTemplate(created);
      setIsCreateOpen(false);
      toast.success(t('template_applied_successfully'));
    } catch {
      toast.error(t('template_application_failed'));
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate(templateId, teamId);
      setTemplates((prev) => prev.filter((tp) => tp.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
      toast.success(t('template_applied_successfully'));
    } catch {
      toast.error(t('template_application_failed'));
    }
  };

  const handleSave = async (update: ScheduleTemplateUpdateDTO) => {
    if (!selectedTemplate) return;
    try {
      const updated = await updateTemplate(selectedTemplate.id, teamId, update);
      setTemplates((prev) => prev.map((tp) => (tp.id === updated.id ? updated : tp)));
      setSelectedTemplate(updated);
      toast.success(t('template_applied_successfully'));
    } catch {
      toast.error(t('template_application_failed'));
    }
  };

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

  return (
    <div className="flex h-full">
      {sidebarVisible && (
        <TemplateListSidebar
          lng={lng}
          templates={templates}
          selectedTemplateId={selectedTemplate?.id ?? null}
          isLoading={isLoading}
          onSelect={handleSelectTemplate}
          onCreate={() => setIsCreateOpen(true)}
          onToggleSidebar={() => setSidebarVisible(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {!sidebarVisible && (
          <div className="flex items-center border-b px-2 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSidebarVisible(true)}
                  aria-label={t('show_sidebar')}
                >
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('show_sidebar')}</TooltipContent>
            </Tooltip>
          </div>
        )}
        <TemplateEditor
          lng={lng}
          template={selectedTemplate}
          shifts={shifts}
          team={teamWithMembership.team}
          onSave={handleSave}
          onApply={() => setIsApplyOpen(true)}
        />
      </div>

      <TemplateCreateDialog
        lng={lng}
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
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
