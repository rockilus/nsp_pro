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
import {
  ScheduleTemplateDTO,
  ScheduleTemplateUpdateDTO,
  ScheduleTemplateWeekDataDTO,
  ScheduleTemplateEntryDTO,
  TemplateType,
  TEMPLATE_TYPE_CONSTRAINTS,
  SCHEDULE_TEMPLATE_CONSTRAINTS,
} from '../../types/schedule-template';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Trash2, Play } from 'lucide-react';

const DAY_NAMES = [
  'monday_short',
  'tuesday_short',
  'wednesday_short',
  'thursday_short',
  'friday_short',
  'saturday_short',
  'sunday_short',
] as const;

interface TemplateEditorProps {
  lng: string;
  template: ScheduleTemplateDTO | null;
  onSave: (update: ScheduleTemplateUpdateDTO) => void;
  onApply: () => void;
}

export function TemplateEditor({ lng, template, onSave, onApply }: TemplateEditorProps) {
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

  const handleTypeChange = (newType: string) => {
    const t = newType as TemplateType;
    setTemplateType(t);
    setIsDirty(true);

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
    setIsDirty(true);
  };

  const handleRemoveWeek = () => {
    const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];
    if (!constraints.allowWeekModification || weeksData.length <= constraints.minWeeks) return;
    const newWeeks = weeksData
      .filter((_, i) => i !== currentWeek)
      .map((w, i) => ({ ...w, weekNumber: i }));
    setWeeksData(newWeeks);
    setCurrentWeek(Math.min(currentWeek, newWeeks.length - 1));
    setIsDirty(true);
  };

  const handleEntryChange = (dayOfWeek: number, entry: ScheduleTemplateEntryDTO | null) => {
    const current = weeksData[currentWeek];
    if (!current) return;

    const otherEntries = current.entries.filter(
      (e) => !(e.shiftId === entry?.shiftId && e.dayOfWeek === dayOfWeek),
    );

    let newEntries: ScheduleTemplateEntryDTO[];
    if (entry && (entry.demandCount > 0 || entry.workerIds.length > 0)) {
      newEntries = [...otherEntries, entry];
    } else {
      newEntries = otherEntries;
    }

    const newWeeks = weeksData.map((w) =>
      w.weekNumber === currentWeek ? { ...w, entries: newEntries } : w,
    );
    setWeeksData(newWeeks);
    setIsDirty(true);
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

  const currentWeekData = weeksData[currentWeek];
  const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];

  if (!template) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        {t('select_template_to_view')}
      </div>
    );
  }

  const getEntriesForShiftAndDay = (shiftId: string, dayOfWeek: number) => {
    if (!currentWeekData) return null;
    return (
      currentWeekData.entries.find((e) => e.shiftId === shiftId && e.dayOfWeek === dayOfWeek) ??
      null
    );
  };

  const uniqueShiftIds = new Set<string>();
  weeksData.forEach((w) => w.entries.forEach((e) => uniqueShiftIds.add(e.shiftId)));
  const shifts = Array.from(uniqueShiftIds).slice(0, 20);

  const getDisplayLabel = (entry: ScheduleTemplateEntryDTO | null) => {
    if (!entry) return '';
    const parts: string[] = [];
    if (entry.demandCount > 0) parts.push(`${entry.demandCount}`);
    if (entry.workerIds.length > 0) parts.push(`(${entry.workerIds.length})`);
    return parts.join(' ');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <input
          className="min-w-0 flex-1 border-b border-transparent bg-transparent px-1 text-sm font-semibold outline-none hover:border-input focus:border-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setIsDirty(true);
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

        {constraints.allowWeekModification && (
          <>
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
          </>
        )}

        <Badge variant="outline" className="ml-2">
          {templateType === TemplateType.EVEN_ODD
            ? currentWeek === 0
              ? t('even_week')
              : t('odd_week')
            : `${t('week')} ${currentWeek + 1}/${weeksData.length}`}
        </Badge>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {shifts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p>{t('no_templates_description')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-px overflow-hidden rounded-md bg-border">
            <div className="bg-card p-2 text-sm font-medium text-muted-foreground">
              {t('shift')}
            </div>
            {DAY_NAMES.map((dayKey) => (
              <div
                key={dayKey}
                className="bg-card p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {t(dayKey)}
              </div>
            ))}

            {shifts.map((shiftId) => (
              <React.Fragment key={shiftId}>
                <div className="truncate border-r bg-card p-2 text-sm" title={shiftId}>
                  {shiftId}
                </div>
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const entry = getEntriesForShiftAndDay(shiftId, dayIndex);
                  const label = getDisplayLabel(entry);
                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        'flex min-h-[2.25rem] cursor-pointer items-center justify-center bg-card p-1 text-center text-xs transition-colors hover:bg-accent',
                      )}
                      onClick={() => {
                        const newDemandCount = entry ? (entry.demandCount > 0 ? 0 : 1) : 1;
                        handleEntryChange(dayIndex, {
                          shiftId,
                          dayOfWeek: dayIndex,
                          demandCount: newDemandCount,
                          workerIds: entry?.workerIds ?? [],
                        });
                      }}
                    >
                      {label && (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            entry && entry.demandCount > 0
                              ? 'bg-primary/10 text-primary'
                              : 'bg-secondary text-secondary-foreground',
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
