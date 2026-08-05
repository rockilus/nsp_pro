'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplateShiftTable } from './TemplateShiftTable';
import {
  ScheduleTemplateDTO,
  ScheduleTemplateUpdateDTO,
  ScheduleTemplateWeekDataDTO,
  TemplateType,
  TEMPLATE_TYPE_CONSTRAINTS,
  SCHEDULE_TEMPLATE_CONSTRAINTS,
} from '../../types/schedule-template';
import { ShiftT } from '../../types/shift';
import { TeamT } from '../../types/team';
import { ChevronLeft, ChevronRight, Plus, Trash2, Play } from 'lucide-react';

interface TemplateEditorProps {
  lng: string;
  template: ScheduleTemplateDTO | null;
  shifts: ShiftT[];
  team: TeamT;
  onSave: (update: ScheduleTemplateUpdateDTO) => void;
  onApply: () => void;
}

export function TemplateEditor({
  lng,
  template,
  shifts,
  team,
  onSave,
  onApply,
}: TemplateEditorProps) {
  const { t } = useTranslation(lng, 'schedule-templates');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>(TemplateType.STANDARD);
  const [weeksData, setWeeksData] = useState<ScheduleTemplateWeekDataDTO[]>([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description ?? '');
      setTemplateType(template.templateType as TemplateType);
      setWeeksData(template.weeksData.map((w) => ({ ...w, entries: [...w.entries] })));
      setCurrentWeek(0);
      setIsDirty(false);
    }
  }, [template]);

  const markDirty = () => setIsDirty(true);

  const handleTypeChange = (newType: string) => {
    const t = newType as TemplateType;
    setTemplateType(t);
    markDirty();

    if (t === TemplateType.EVEN_ODD) {
      let newWeeks = [...weeksData];
      while (newWeeks.length < 2) {
        newWeeks.push({ weekNumber: newWeeks.length, entries: [] });
      }
      newWeeks = newWeeks.slice(0, 2).map((w, i) => ({ ...w, weekNumber: i }));
      setWeeksData(newWeeks);
      setCurrentWeek(0);
    }
  };

  const handleAddWeek = () => {
    const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];
    if (weeksData.length >= constraints.maxWeeks) return;
    const newWeeks = [...weeksData, { weekNumber: weeksData.length, entries: [] }];
    setWeeksData(newWeeks);
    markDirty();
  };

  const handleRemoveWeek = () => {
    const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];
    if (!constraints.allowWeekModification || weeksData.length <= constraints.minWeeks) return;
    const newWeeks = weeksData
      .filter((_, i) => i !== currentWeek)
      .map((w, i) => ({ ...w, weekNumber: i }));
    setWeeksData(newWeeks);
    setCurrentWeek(Math.min(currentWeek, newWeeks.length - 1));
    markDirty();
  };

  const handleWeeksDataChange = (newWeeks: ScheduleTemplateWeekDataDTO[]) => {
    setWeeksData(newWeeks);
    markDirty();
  };

  const handleSave = () => {
    onSave({
      name: name || undefined,
      description: description || undefined,
      templateType,
      weeksData,
    });
    setIsDirty(false);
  };

  const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];

  if (!template) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        {t('select_template_to_view')}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <input
          className="min-w-0 flex-1 border-b border-transparent bg-transparent px-1 text-sm font-semibold outline-none hover:border-input focus:border-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          maxLength={SCHEDULE_TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH}
        />

        <Select value={templateType} onValueChange={handleTypeChange}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TemplateType.STANDARD}>{t('standard')}</SelectItem>
            <SelectItem value={TemplateType.EVEN_ODD}>{t('even_odd')}</SelectItem>
          </SelectContent>
        </Select>

        <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty}>
          {t('save')}
        </Button>

        <div className="flex-1" />

        <Button size="sm" onClick={onApply} className="gap-1">
          <Play className="h-3.5 w-3.5" />
          {t('apply_template')}
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
          weeksData={weeksData}
          onWeeksDataChange={handleWeeksDataChange}
          onNameChange={(n) => {
            setName(n);
            markDirty();
          }}
          onDescriptionChange={(d) => {
            setDescription(d);
            markDirty();
          }}
          onTemplateTypeChange={(t) => {
            setTemplateType(t);
            markDirty();
          }}
        />
      </div>
    </div>
  );
}
