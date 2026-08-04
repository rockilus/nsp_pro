import React, { useEffect, useState } from 'react';
import { Plus, Play, Trash2, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useTranslation } from '../../../app/i18n/client';
import { AssignmentTemplateListItem } from '../../../types/assignment-template';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardDescription, CardTitle } from '../../ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { ConfirmationDialog } from '../../common/ConfirmationDialog';

interface ScheduleTemplateListProps {
  lng: string;
  teamId: string;
  templates: AssignmentTemplateListItem[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: AssignmentTemplateListItem) => void;
  onApplyTemplate: (templateId: string) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: () => void;
  onError: (error: string) => void;
  onTemplatesLoaded: (templates: AssignmentTemplateListItem[]) => void;
  onLoadTemplates: () => Promise<void>;
  onDeleteTemplateRequest: (templateId: string) => Promise<void>;
}

export function ScheduleTemplateList({
  lng,
  teamId,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onApplyTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  onError,
  onTemplatesLoaded,
  onLoadTemplates,
  onDeleteTemplateRequest,
}: ScheduleTemplateListProps) {
  const { t } = useTranslation(lng, 'schedule-page');
  const [loading, setLoading] = React.useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (teamId) {
      setLoading(true);
      onLoadTemplates()
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    }
  }, [teamId, onLoadTemplates]);

  const handleDeleteConfirm = async () => {
    if (!deleteTemplateId) return;
    setDeleteLoading(true);
    try {
      await onDeleteTemplateRequest(deleteTemplateId);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('error_deleting_template'));
    } finally {
      setDeleteLoading(false);
      setDeleteTemplateId(null);
    }
  };

  const typeBadge = (templateType: string) => {
    const isStandard = templateType === 'standard';
    return (
      <Badge variant={isStandard ? 'secondary' : 'outline'} className="shrink-0">
        {isStandard ? t('template_type_standard') : t('template_type_even_odd')}
      </Badge>
    );
  };

  return (
    <div className="flex h-full flex-col p-3">
      <Button data-testid="create-template-btn" onClick={onCreateTemplate} className="w-full">
        <Plus className="size-4" />
        {t('create_new_template')}
      </Button>

      <div className="mt-3 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">{t('loading_templates')}</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <p className="text-sm font-medium">{t('no_templates')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('no_templates_description')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((tmpl) => (
              <Card
                key={tmpl.id}
                data-testid={`template-card-${tmpl.id}`}
                className={`group cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm ${
                  selectedTemplateId === tmpl.id ? 'bg-primary/5 ring-2 ring-primary' : ''
                }`}
                onClick={() => onSelectTemplate(tmpl)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-sm">{tmpl.name}</CardTitle>
                      <div className="mt-1.5 flex items-center gap-2">
                        {typeBadge(tmpl.templateType)}
                        <span className="text-xs text-muted-foreground">
                          {tmpl.totalEntries} {t('entries')}
                        </span>
                      </div>
                      {tmpl.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {tmpl.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            data-testid={`apply-template-${tmpl.id}`}
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyTemplate(tmpl.id);
                            }}
                          >
                            <Play className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('apply')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            data-testid={`delete-template-${tmpl.id}`}
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTemplateId(tmpl.id);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('delete_template')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={deleteTemplateId !== null}
        onClose={() => setDeleteTemplateId(null)}
        onConfirm={handleDeleteConfirm}
        title={t('delete_template')}
        content={t('confirm_delete_template')}
        confirmText={t('delete_template')}
        cancelText={t('cancel')}
        confirmColor="error"
        showIcon
        testId="schedule-template-delete-confirmation"
      />
    </div>
  );
}
