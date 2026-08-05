'use client';

import React from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, PanelLeftClose } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScheduleTemplateDTO, TemplateType } from '../../types/schedule-template';
import { cn } from '@/lib/utils';

interface TemplateListSidebarProps {
  lng: string;
  templates: ScheduleTemplateDTO[];
  selectedTemplateId: string | null;
  isLoading: boolean;
  onSelect: (template: ScheduleTemplateDTO) => void;
  onCreate: () => void;
  onToggleSidebar: () => void;
}

export function TemplateListSidebar({
  lng,
  templates,
  selectedTemplateId,
  isLoading,
  onSelect,
  onCreate,
  onToggleSidebar,
}: TemplateListSidebarProps) {
  const { t } = useTranslation(lng, 'schedule-templates');

  const templateTypeLabel = (type: string) => {
    if (type === TemplateType.EVEN_ODD) return t('even_odd');
    return t('standard');
  };

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">{t('schedule_templates')}</h2>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onCreate}
                aria-label={t('create_new_template')}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('create_new_template')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onToggleSidebar}
                aria-label={t('hide_sidebar')}
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('hide_sidebar')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : templates.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>{t('no_templates')}</p>
            <p className="mt-1 text-xs">{t('no_templates_description')}</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className={cn(
                  'cursor-pointer rounded-md px-2 py-1.5 text-sm transition-colors',
                  selectedTemplateId === template.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted',
                )}
                onClick={() => onSelect(template)}
              >
                <div className="truncate font-medium">{template.name}</div>
                                {template.description && (
                  <div className="mt-0.5 mb-1 truncate text-xs text-muted-foreground/70">
                    {template.description}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                    {templateTypeLabel(template.templateType)}
                  </Badge>
                  <span>
                    {template.weeksData.length} {t('weeks').toLowerCase()}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
