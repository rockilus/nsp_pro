'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { TemplateScopeDialog } from './TemplateScopeDialog';
import {
  ScheduleTemplateDTO,
  ScheduleTemplateWeekDataDTO,
  TemplateType,
  TEMPLATE_TYPE_CONSTRAINTS,
} from '../../types/schedule-template';
import { ShiftT } from '../../types/shift';
import { TeamT } from '../../types/team';
import { WorkerT } from '../../types/worker';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Play,
  PanelLeftOpen,
  Pencil,
  Download,
  CheckSquare,
  Filter,
} from 'lucide-react';

const MAX_VISIBLE_WEEKS = 4;

interface TemplateEditorProps {
  lng: string;
  template: ScheduleTemplateDTO | null;
  shifts: ShiftT[];
  team: TeamT;
  workers: WorkerT[];
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTemplateChange: (
    weeksData: ScheduleTemplateWeekDataDTO[],
    scopeShiftIds?: string[],
    includeAllWorkShifts?: boolean,
  ) => void;
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
  workers,
  sidebarVisible,
  onToggleSidebar,
  onApply,
  onEdit,
  onDelete,
  onTemplateChange,
}: TemplateEditorProps) {
  const { t } = useTranslation(lng, 'schedule-templates');

  const [templateType, setTemplateType] = useState<TemplateType>(TemplateType.STANDARD);
  const [weekOffset, setWeekOffset] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);

  useEffect(() => {
    if (template) {
      setTemplateType(template.templateType as TemplateType);
      setWeekOffset(0);
    }
  }, [template]);

  const weeksData = template?.weeksData ?? [];
  const totalWeeks = weeksData.length;
  const canPaginate = totalWeeks > MAX_VISIBLE_WEEKS;
  const visibleEnd = Math.min(weekOffset + MAX_VISIBLE_WEEKS, totalWeeks);

  const clampOffset = useCallback(
    (offset: number) => {
      const maxOffset = Math.max(0, totalWeeks - MAX_VISIBLE_WEEKS);
      return Math.max(0, Math.min(offset, maxOffset));
    },
    [totalWeeks],
  );

  const handleWeekOffsetChange = (direction: -1 | 1) => {
    setWeekOffset((w) => clampOffset(w + direction));
  };

  useEffect(() => {
    setWeekOffset((w) => clampOffset(w));
  }, [totalWeeks, clampOffset]);

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

  const handleAddWeek = () => {
    if (weeksData.length >= constraints.maxWeeks) return;
    const updated = [...weeksData, { weekNumber: weeksData.length, entries: [] }];
    onTemplateChange(updated);
  };

  const handleRemoveWeek = () => {
    if (!constraints.allowWeekModification || weeksData.length <= constraints.minWeeks) return;
    const updated = weeksData
      .filter((_, i) => i !== weekOffset)
      .map((w, i) => ({ ...w, weekNumber: i }));
    onTemplateChange(updated);
  };

  const handleWeeksDataChange = (updated: ScheduleTemplateWeekDataDTO[]) => {
    onTemplateChange(updated);
  };

  const handleScopeSave = (includeAllWorkShifts: boolean, newScopeShiftIds: string[]) => {
    const removedIds = (template.scopeShiftIds ?? []).filter(
      (id) => !includeAllWorkShifts && !newScopeShiftIds.includes(id),
    );
    const cleanedWeeksData = weeksData.map((week) => ({
      ...week,
      entries: week.entries.filter((e) => !removedIds.includes(e.shiftId)),
    }));
    onTemplateChange(cleanedWeeksData, newScopeShiftIds, includeAllWorkShifts);
  };

  const weekLabel =
    templateType === TemplateType.EVEN_ODD
      ? weekOffset === 0
        ? t('even_week')
        : t('odd_week')
      : canPaginate
        ? t('weeks_range', {
            start: weekOffset + 1,
            end: visibleEnd,
            total: totalWeeks,
          })
        : t('weeks_range', { start: 1, end: totalWeeks, total: totalWeeks });

  const navDisabled = !canPaginate;

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

      <div className="flex items-center gap-1 border-b px-3 py-1.5">
        <Button
          variant="outline"
          size="icon-xs"
          disabled={navDisabled || weekOffset <= 0}
          onClick={() => handleWeekOffsetChange(-1)}
          aria-label={t('previous_week')}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="min-w-[100px] text-center text-xs font-medium">{weekLabel}</span>

        <Button
          variant="outline"
          size="icon-xs"
          disabled={navDisabled || weekOffset >= totalWeeks - MAX_VISIBLE_WEEKS}
          onClick={() => handleWeekOffsetChange(1)}
          aria-label={t('next_week')}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {constraints.allowWeekModification && (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:text-destructive"
              onClick={handleRemoveWeek}
              disabled={weeksData.length <= constraints.minWeeks}
              aria-label={t('remove_week')}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleAddWeek}
              disabled={weeksData.length >= constraints.maxWeeks}
              aria-label={t('add_week')}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setImportOpen(true)}
          aria-label={t('import_from_schedule')}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setScopeOpen(true)}
          aria-label={t('scope')}
        >
          <Filter className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setSelectionEnabled((v) => !v)}
          aria-label={selectionEnabled ? t('exit_selection') : t('select')}
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <TemplateShiftTable
          lng={lng}
          template={template}
          shifts={shifts}
          team={team}
          workers={workers}
          templateType={templateType}
          weeksData={weeksData}
          weekOffset={weekOffset}
          scopeShiftIds={template.scopeShiftIds ?? []}
          includeAllWorkShifts={template.includeAllWorkShifts ?? true}
          onWeeksDataChange={handleWeeksDataChange}
          selectionEnabled={selectionEnabled}
          onToggleSelection={() => setSelectionEnabled((v) => !v)}
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

      <Dialog open={importOpen} onOpenChange={(v) => !v && setImportOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('import_from_schedule')}</DialogTitle>
            <DialogDescription>
              Import an existing schedule into a template. Select a date range to extract shift
              demands and assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateScopeDialog
        lng={lng}
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        shifts={shifts}
        scopeShiftIds={template.scopeShiftIds ?? []}
        includeAllWorkShifts={template.includeAllWorkShifts ?? true}
        weeksData={weeksData}
        onSave={handleScopeSave}
      />
    </div>
  );
}
