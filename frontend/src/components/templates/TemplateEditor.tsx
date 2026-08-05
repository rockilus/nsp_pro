'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TemplateShiftTable } from './TemplateShiftTable';
import {
  ScheduleTemplateDTO,
  TemplateType,
  TEMPLATE_TYPE_CONSTRAINTS,
  SCHEDULE_TEMPLATE_CONSTRAINTS,
} from '../../types/schedule-template';
import { ShiftT } from '../../types/shift';
import { TeamT } from '../../types/team';
import { ChevronLeft, ChevronRight, Plus, Trash2, Play, PanelLeftOpen, Pencil } from 'lucide-react';

interface TemplateEditorProps {
  lng: string;
  template: ScheduleTemplateDTO | null;
  shifts: ShiftT[];
  team: TeamT;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const templateTypeLabelFn = (type: string, t: (key: string) => string) => {
  if (type === TemplateType.EVEN_ODD) return t('even_odd');
  return t('standard');
};

export function TemplateEditor({
  lng,
  template,
  shifts,
  team,
  sidebarVisible,
  onToggleSidebar,
  onApply,
  onEdit,
  onDelete,
}: TemplateEditorProps) {
  const { t } = useTranslation(lng, 'schedule-templates');

  const [templateType, setTemplateType] = useState<TemplateType>(TemplateType.STANDARD);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (template) {
      setTemplateType(template.templateType as TemplateType);
      setCurrentWeek(0);
    }
  }, [template]);

  const handleTypeChange = (newType: TemplateType) => {
    setTemplateType(newType);
  };

  const handleAddWeek = () => {
    const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];
    if (currentWeek + 1 >= constraints.maxWeeks) return;
    setCurrentWeek((w) => w + 1);
  };

  const handleRemoveWeek = () => {
    const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];
    if (!constraints.allowWeekModification || currentWeek <= 0) return;
    setCurrentWeek((w) => w - 1);
  };

  if (!template) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        {!sidebarVisible && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleSidebar}
            aria-label={t('show_sidebar')}
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </Button>
        )}
        {t('select_template_to_view')}
      </div>
    );
  }

  const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];
  const weeksData = template.weeksData;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {!sidebarVisible && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleSidebar}
            aria-label={t('show_sidebar')}
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </Button>
        )}

        <span className="max-w-[200px] truncate text-sm font-semibold">{template.name}</span>

        <Badge variant="outline" className="h-4 px-1 text-[10px]">
          {templateTypeLabelFn(template.templateType, t)}
        </Badge>

        <div className="flex-1" />

        <Button size="icon-xs" variant="ghost" onClick={onEdit} aria-label={t('edit_template')}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="icon-xs"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          aria-label={t('delete_template')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <Button size="icon-xs" onClick={onApply} aria-label={t('apply')}>
          <Play className="h-3.5 w-3.5" />
        </Button>
      </div>

      {constraints.allowWeekModification && (
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Button
            variant="outline"
            size="icon-xs"
            disabled={currentWeek <= 0}
            onClick={() => setCurrentWeek((w) => w - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="min-w-20 text-center text-sm font-medium">
            {t('week_number', { number: currentWeek + 1 })}
          </span>

          <Button
            variant="outline"
            size="icon-xs"
            disabled={currentWeek >= weeksData.length - 1}
            onClick={() => setCurrentWeek((w) => w + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="ml-2 gap-1"
            onClick={handleAddWeek}
            disabled={weeksData.length >= constraints.maxWeeks}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('add_week')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-destructive hover:text-destructive"
            onClick={handleRemoveWeek}
            disabled={weeksData.length <= constraints.minWeeks}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('remove_week')}
          </Button>

          <Badge variant="outline" className="ml-2">
            {templateType === TemplateType.EVEN_ODD
              ? currentWeek === 0
                ? t('even_week')
                : t('odd_week')
              : `${t('week')} ${currentWeek + 1}/${weeksData.length}`}
          </Badge>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <TemplateShiftTable
          lng={lng}
          template={template}
          shifts={shifts}
          team={team}
          templateType={templateType}
          weeksData={template.weeksData}
          onWeeksDataChange={() => {}}
          onNameChange={() => {}}
          onDescriptionChange={() => {}}
          onTemplateTypeChange={handleTypeChange}
        />
      </div>

      <Dialog open={deleteOpen} onOpenChange={(v) => !v && setDeleteOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('delete_template')}</DialogTitle>
            <DialogDescription>
              {t('confirm_delete_template', { name: template.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false);
                onDelete();
              }}
            >
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
