'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../app/i18n/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
// Components
import WorkerSpecialtyCellEdit from '../worker-field-cell/specialties/worker-specialty-cell-edit';
// Types
import { WorkerT } from '../../../types/worker';
import { DimensionT, DimensionEntryType, DimensionType } from '../../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { AttributeT, AttributeOwnerType } from '../../../types/attribute';
import { SpecialtyT } from '@/types/specialty';

dayjs.extend(utc);

interface WorkerEditDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  worker: WorkerT;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  specialties: SpecialtyT[];
  handleUpdateWorker: (worker: WorkerT) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
}

export default function WorkerEditDialog({
  lng,
  open,
  onClose,
  worker,
  dimensions,
  dimEntries,
  specialties,
  handleUpdateWorker,
  handleUpdateAttribute,
}: WorkerEditDialogProps) {
  const { t } = useTranslation(lng, 'worker-page');

  type FormState = {
    name: string;
    acronym: string;
    employmentStartDate: dayjs.Dayjs;
    employmentEndDate: dayjs.Dayjs | null;
    weeklyHours: number;
    weeklyHoursDesired: number;
    dutiesPerMonth: number;
    annualLeave: number;
    selectedSpecialties: SpecialtyT[];
    changedAttributes: Map<string, AttributeT>;
  };

  const buildFormState = (): FormState => ({
    name: worker.name,
    acronym: worker.acronym,
    employmentStartDate: worker.employmentStartDate,
    employmentEndDate: worker.employmentEndDate,
    weeklyHours: worker.weeklyHours,
    weeklyHoursDesired: worker.weeklyHoursDesired,
    dutiesPerMonth: worker.dutiesPerMonth,
    annualLeave: worker.annualLeave,
    selectedSpecialties: specialties.filter((s) => worker.specialtyIds.includes(s.id)),
    changedAttributes: new Map(),
  });

  const [form, setForm] = useState<FormState>(buildFormState);

  const patch = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }));

  // Re-sync when a different worker is opened
  useEffect(() => {
    if (open) {
      setForm(buildFormState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, worker.id]);

  const workerDimensions = dimensions.filter((d) => d.dimTypes.includes(DimensionType.WORKER));

  const getAttributeForDim = (dim: DimensionT): AttributeT => {
    const existing = worker.attributes.find((a) => a.dimensionId === dim.id);
    if (existing) return existing;
    return {
      id: '',
      ownerType: AttributeOwnerType.WORKER,
      ownerId: worker.id,
      dimensionId: dim.id,
      value: dim.entryType === DimensionEntryType.BOOL ? false : '',
      dimEntryIds: [],
    };
  };

  const getAttributeValue = (dim: DimensionT): string | number | boolean => {
    const changed = form.changedAttributes.get(dim.id);
    if (changed !== undefined) return changed.value;
    return getAttributeForDim(dim).value;
  };

  const handleAttributeChange = (dim: DimensionT, value: string | number | boolean) => {
    const base = getAttributeForDim(dim);
    patch({
      changedAttributes: new Map(form.changedAttributes).set(dim.id, { ...base, value }),
    });
  };

  const handleSave = () => {
    const updatedWorker: WorkerT = {
      ...worker,
      name: form.name,
      acronym: form.acronym,
      employmentStartDate: form.employmentStartDate,
      employmentEndDate: form.employmentEndDate,
      weeklyHours: form.weeklyHours,
      weeklyHoursDesired: form.weeklyHoursDesired,
      dutiesPerMonth: form.dutiesPerMonth,
      annualLeave: form.annualLeave,
      specialtyIds: form.selectedSpecialties.map((s) => s.id),
    };
    handleUpdateWorker(updatedWorker);

    form.changedAttributes.forEach((attribute) => {
      handleUpdateAttribute(attribute, worker.teamId);
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-full flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{t('edit_worker')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* General section */}
          <SectionLabel label={t('section_general')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label={t('name')} htmlFor="edit-worker-name">
              <Input
                id="edit-worker-name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                data-testid="edit-worker-name-input"
              />
            </FieldRow>
            <FieldRow label={t('acronym')} htmlFor="edit-worker-acronym">
              <Input
                id="edit-worker-acronym"
                value={form.acronym}
                onChange={(e) => patch({ acronym: e.target.value })}
                data-testid="edit-worker-acronym-input"
              />
            </FieldRow>
          </div>

          {/* Employment section */}
          <SectionLabel label={t('section_employment')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label={t('employment_start_date')} htmlFor="edit-worker-start">
              <Input
                id="edit-worker-start"
                type="date"
                value={form.employmentStartDate.format('YYYY-MM-DD')}
                onChange={(e) => {
                  if (e.target.value) patch({ employmentStartDate: dayjs.utc(e.target.value) });
                }}
                data-testid="edit-worker-start-input"
              />
            </FieldRow>
            <FieldRow label={t('employment_end_date')} htmlFor="edit-worker-end">
              <div className="flex flex-col gap-1.5">
                <Input
                  id="edit-worker-end"
                  type="date"
                  value={form.employmentEndDate ? form.employmentEndDate.format('YYYY-MM-DD') : ''}
                  disabled={!form.employmentEndDate}
                  onChange={(e) => {
                    if (e.target.value) patch({ employmentEndDate: dayjs.utc(e.target.value) });
                  }}
                  data-testid="edit-worker-end-input"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-worker-permanent"
                    checked={!form.employmentEndDate}
                    onCheckedChange={(checked) =>
                      patch({ employmentEndDate: checked ? null : dayjs.utc() })
                    }
                    data-testid="edit-worker-permanent-checkbox"
                  />
                  <Label htmlFor="edit-worker-permanent" className="cursor-pointer text-sm">
                    {t('permanent')}
                  </Label>
                </div>
              </div>
            </FieldRow>
          </div>

          {/* Schedule section */}
          <SectionLabel label={t('section_schedule')} />
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label={t('weekly_hours')} htmlFor="edit-worker-weekly-hours">
              <Input
                id="edit-worker-weekly-hours"
                type="number"
                min={0}
                value={form.weeklyHours}
                onChange={(e) => patch({ weeklyHours: Number(e.target.value) })}
                data-testid="edit-worker-weekly-hours-input"
              />
            </FieldRow>
            <FieldRow label={t('weekly_hours_desired')} htmlFor="edit-worker-weekly-hours-desired">
              <Input
                id="edit-worker-weekly-hours-desired"
                type="number"
                min={0}
                value={form.weeklyHoursDesired}
                onChange={(e) => patch({ weeklyHoursDesired: Number(e.target.value) })}
                data-testid="edit-worker-weekly-hours-desired-input"
              />
            </FieldRow>
            <FieldRow label={t('duties_per_month')} htmlFor="edit-worker-duties">
              <Input
                id="edit-worker-duties"
                type="number"
                min={0}
                value={form.dutiesPerMonth}
                onChange={(e) => patch({ dutiesPerMonth: Number(e.target.value) })}
                data-testid="edit-worker-duties-input"
              />
            </FieldRow>
            <FieldRow label={t('annual_leave')} htmlFor="edit-worker-annual-leave">
              <Input
                id="edit-worker-annual-leave"
                type="number"
                min={0}
                value={form.annualLeave}
                onChange={(e) => patch({ annualLeave: Number(e.target.value) })}
                data-testid="edit-worker-annual-leave-input"
              />
            </FieldRow>
          </div>

          {/* Skills section */}
          {specialties.length > 0 && (
            <>
              <SectionLabel label={t('section_skills')} />
              <div className="rounded-md border p-3">
                <WorkerSpecialtyCellEdit
                  selectedSpecialties={form.selectedSpecialties}
                  specialties={specialties}
                  handleAddSpecialty={(specialty) =>
                    patch({ selectedSpecialties: [...form.selectedSpecialties, specialty] })
                  }
                  handleRemoveSpecialty={(specialty) =>
                    patch({
                      selectedSpecialties: form.selectedSpecialties.filter(
                        (s) => s.id !== specialty.id,
                      ),
                    })
                  }
                  handleClose={() => {}}
                />
              </div>
            </>
          )}

          {/* Custom attributes section */}
          {workerDimensions.length > 0 && (
            <>
              <SectionLabel label={t('section_attributes')} />
              <div className="flex flex-col gap-3">
                {workerDimensions.map((dim) => (
                  <AttributeRow
                    key={dim.id}
                    dim={dim}
                    dimEntries={dimEntries.filter((de) => de.dimensionId === dim.id)}
                    value={getAttributeValue(dim)}
                    attribute={form.changedAttributes.get(dim.id) ?? getAttributeForDim(dim)}
                    selectedTeamId={worker.teamId}
                    onChange={(value) => handleAttributeChange(dim, value)}
                    onChangeAttribute={(attribute) =>
                      patch({
                        changedAttributes: new Map(form.changedAttributes).set(dim.id, attribute),
                      })
                    }
                    handleUpdateAttribute={handleUpdateAttribute}
                  />
                ))}
              </div>
            </>
          )}

          {/* Bottom padding so last item isn't clipped by footer */}
          <div className="h-4" />
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} data-testid="edit-worker-cancel-button">
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} data-testid="edit-worker-save-button">
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mt-5 mb-3 first:mt-0">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <Separator />
    </div>
  );
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

interface AttributeRowProps {
  dim: DimensionT;
  dimEntries: DimEntryT[];
  value: string | number | boolean;
  attribute: AttributeT;
  selectedTeamId: string;
  onChange: (value: string | number | boolean) => void;
  onChangeAttribute: (attribute: AttributeT) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
}

function AttributeRow({
  dim,
  dimEntries,
  value,
  attribute,
  selectedTeamId,
  onChange,
  onChangeAttribute,
  handleUpdateAttribute,
}: AttributeRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="min-w-[6rem] shrink-0 text-sm font-medium">{dim.name}</Label>
      <div className="flex-1">
        {dim.entryType === DimensionEntryType.BOOL ? (
          <Checkbox
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(!!checked)}
            data-testid={`edit-worker-attr-bool-${dim.id}`}
          />
        ) : dim.entryType === DimensionEntryType.INT ? (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
            data-testid={`edit-worker-attr-int-${dim.id}`}
          />
        ) : dim.entryType === DimensionEntryType.DIM_ENTRIES ? (
          <DimEntriesSelector
            attribute={attribute}
            dimEntries={dimEntries}
            selectedTeamId={selectedTeamId}
            onChangeAttribute={onChangeAttribute}
            handleUpdateAttribute={handleUpdateAttribute}
          />
        ) : (
          <Input
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
            data-testid={`edit-worker-attr-str-${dim.id}`}
          />
        )}
      </div>
    </div>
  );
}

function DimEntriesSelector({
  attribute,
  dimEntries,
  selectedTeamId,
  onChangeAttribute,
  handleUpdateAttribute,
}: {
  attribute: AttributeT;
  dimEntries: DimEntryT[];
  selectedTeamId: string;
  onChangeAttribute: (attribute: AttributeT) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedEntries = dimEntries.filter((de) => attribute.dimEntryIds.includes(de.id));
  const available = dimEntries.filter((de) => !attribute.dimEntryIds.includes(de.id));

  const toggle = (entry: DimEntryT) => {
    const isSelected = attribute.dimEntryIds.includes(entry.id);
    const newIds = isSelected
      ? attribute.dimEntryIds.filter((id) => id !== entry.id)
      : [...attribute.dimEntryIds, entry.id];
    onChangeAttribute({ ...attribute, dimEntryIds: newIds });
  };

  return (
    <div className="flex flex-wrap gap-1">
      {dimEntries.map((entry) => {
        const isSelected = attribute.dimEntryIds.includes(entry.id);
        return (
          <Badge
            key={entry.id}
            variant={isSelected ? 'default' : 'outline'}
            className="cursor-pointer select-none"
            onClick={() => toggle(entry)}
            data-testid={`edit-worker-attr-dim-entry-${entry.id}`}
          >
            {entry.name}
          </Badge>
        );
      })}
    </div>
  );
}
