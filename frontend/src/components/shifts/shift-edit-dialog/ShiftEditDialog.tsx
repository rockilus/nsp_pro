'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
// Types
import { ShiftT, ShiftType, ShiftRestType, StaffingT } from '../../../types/shift';
import { DimensionT, DimensionEntryType, DimensionType } from '../../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { AttributeT, AttributeOwnerType } from '../../../types/attribute';
import { SpecialtyT } from '@/types/specialty';
// Constants
import { ShiftColorMappings } from '../../../constants/constants';

dayjs.extend(utc);

interface ShiftEditDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  shift: ShiftT;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  specialties: SpecialtyT[];
  selectedTeamId: string;
  handleUpdateShift: (shift: ShiftT) => Promise<void>;
  handleUpdateAttribute: (attribute: AttributeT) => Promise<void>;
}

export default function ShiftEditDialog({
  lng,
  open,
  onClose,
  shift,
  dimensions,
  dimEntries,
  specialties,
  selectedTeamId,
  handleUpdateShift,
  handleUpdateAttribute,
}: ShiftEditDialogProps) {
  const { t } = useTranslation(lng, 'shift-page');
  const isRest = shift.shiftType === ShiftType.REST;

  type FormState = {
    name: string;
    acronym: string;
    acronymCustom: boolean;
    color: string;
    startTime: dayjs.Dayjs;
    endTime: dayjs.Dayjs;
    shiftType: ShiftType;
    recuperationTime: number;
    staffing: StaffingT[];
    restType: ShiftRestType;
    useCustomWorkTime: boolean;
    customWorkTimeMinutes: number;
    extraDays: number;
    changedAttributes: Map<string, AttributeT>;
  };

  const deriveEndTimeFields = (startTime: dayjs.Dayjs, endTime: dayjs.Dayjs) => {
    const totalMinutes = endTime.diff(startTime, 'minute');
    const endMinOfDay = endTime.hour() * 60 + endTime.minute();
    const startMinOfDay = startTime.hour() * 60 + startTime.minute();
    let naturalMinutes = endMinOfDay - startMinOfDay;
    if (naturalMinutes < 0) naturalMinutes += 24 * 60;
    const extraDays = Math.round((totalMinutes - naturalMinutes) / (24 * 60));
    return { extraDays: Math.max(0, extraDays) };
  };

  const buildFormState = (): FormState => ({
    name: shift.name,
    acronym: shift.acronym,
    acronymCustom: shift.acronymCustom,
    color: shift.color,
    startTime: shift.startTime,
    endTime: shift.endTime,
    shiftType: shift.shiftType,
    recuperationTime: shift.recuperationTime,
    staffing: shift.staffing.map((s) => ({ ...s })),
    restType: shift.restType,
    useCustomWorkTime: shift.useCustomWorkTime ?? false,
    customWorkTimeMinutes: shift.customWorkTimeMinutes ?? 0,
    extraDays: deriveEndTimeFields(shift.startTime, shift.endTime).extraDays,
    changedAttributes: new Map(),
  });

  const [form, setForm] = useState<FormState>(buildFormState);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const [extraDaysRaw, setExtraDaysRaw] = useState<string>(
    String(deriveEndTimeFields(shift.startTime, shift.endTime).extraDays),
  );
  const [recuperationTimeRaw, setRecuperationTimeRaw] = useState<string>(
    String(shift.recuperationTime),
  );
  const [customWorkTimeHoursRaw, setCustomWorkTimeHoursRaw] = useState<string>(
    String(Math.floor((shift.customWorkTimeMinutes ?? 0) / 60)),
  );
  const [customWorkTimeMinutesRaw, setCustomWorkTimeMinutesRaw] = useState<string>(
    String((shift.customWorkTimeMinutes ?? 0) % 60),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const patch = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }));

  useEffect(() => {
    if (open) {
      const fresh = buildFormState();
      setForm(fresh);
      setExtraDaysRaw(String(fresh.extraDays));
      setRecuperationTimeRaw(String(fresh.recuperationTime));
      setCustomWorkTimeHoursRaw(String(Math.floor(fresh.customWorkTimeMinutes / 60)));
      setCustomWorkTimeMinutesRaw(String(fresh.customWorkTimeMinutes % 60));
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shift.id]);

  const isDuty = form.shiftType === ShiftType.DUTY;

  const startTimeSlots = useMemo(() => {
    const slots: dayjs.Dayjs[] = [];
    let slot = dayjs.utc().startOf('day');
    const last = slot.endOf('day');
    while (slot.isBefore(last) || slot.isSame(last)) {
      slots.push(slot);
      slot = slot.add(15, 'minute');
    }
    return slots;
  }, []);

  const endTimeSlots = useMemo(() => {
    const slots: dayjs.Dayjs[] = [];
    let slot = dayjs.utc().startOf('day');
    const last = slot.endOf('day');
    while (slot.isBefore(last) || slot.isSame(last)) {
      slots.push(slot);
      slot = slot.add(15, 'minute');
    }
    return slots;
  }, []);

  const shiftDimensions = useMemo(
    () =>
      dimensions.filter((d) =>
        d.dimTypes.includes(isRest ? DimensionType.REST_SHIFT : DimensionType.SHIFT),
      ),
    [dimensions, isRest],
  );

  const getAttributeForDim = (dim: DimensionT): AttributeT => {
    const existing = shift.attributes.find((a) => a.dimensionId === dim.id);
    if (existing) return existing;
    return {
      id: '',
      ownerType: AttributeOwnerType.SHIFT,
      ownerId: shift.id,
      dimensionId: dim.id,
      value:
        dim.entryType === DimensionEntryType.BOOL
          ? false
          : dim.entryType === DimensionEntryType.INT
            ? 0
            : '',
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

  const handleAddStaffing = (specialtyId: string | null) => {
    if (form.staffing.some((s) => s.specialtyId === specialtyId)) return;
    patch({ staffing: [...form.staffing, { specialtyId, staffing: 1 }] });
  };

  const handleRemoveStaffing = (specialtyId: string | null) => {
    patch({ staffing: form.staffing.filter((s) => s.specialtyId !== specialtyId) });
  };

  const handleStaffingCountChange = (specialtyId: string | null, delta: number) => {
    patch({
      staffing: form.staffing.map((s) =>
        s.specialtyId === specialtyId ? { ...s, staffing: Math.max(0, s.staffing + delta) } : s,
      ),
    });
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    if (extraDaysRaw.trim() === '' || isNaN(parseInt(extraDaysRaw, 10))) {
      newErrors.extraDays = 'error';
    }
    if (isDuty && (recuperationTimeRaw.trim() === '' || isNaN(Number(recuperationTimeRaw)))) {
      newErrors.recuperationTime = 'error';
    }
    if (form.useCustomWorkTime) {
      if (customWorkTimeHoursRaw.trim() === '' || isNaN(parseInt(customWorkTimeHoursRaw, 10))) {
        newErrors.customWorkTimeHours = 'error';
      }
      if (customWorkTimeMinutesRaw.trim() === '' || isNaN(parseInt(customWorkTimeMinutesRaw, 10))) {
        newErrors.customWorkTimeMinutes = 'error';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const startMinOfDay = form.startTime.hour() * 60 + form.startTime.minute();
    const endMinOfDay = form.endTime.hour() * 60 + form.endTime.minute();
    let naturalMinutes = endMinOfDay - startMinOfDay;
    if (naturalMinutes < 0) naturalMinutes += 24 * 60;
    const totalMinutes = naturalMinutes + form.extraDays * 24 * 60;
    const computedEndTime = form.startTime.add(totalMinutes, 'minute');

    const updatedShift: ShiftT = {
      ...shift,
      name: form.name,
      acronym: form.acronym,
      acronymCustom: form.acronymCustom,
      color: form.color,
      startTime: form.startTime,
      endTime: computedEndTime,
      shiftType: form.shiftType,
      recuperationTime: form.recuperationTime,
      staffing: form.staffing,
      restType: form.restType,
      useCustomWorkTime: form.useCustomWorkTime,
      customWorkTimeMinutes: form.customWorkTimeMinutes,
    };
    await handleUpdateShift(updatedShift);

    const attributePromises: Promise<void>[] = [];
    form.changedAttributes.forEach((attribute) => {
      attributePromises.push(handleUpdateAttribute(attribute));
    });
    await Promise.all(attributePromises);

    onClose();
  };

  const dialogTitle = isRest ? t('edit_rest') : t('edit_shift');

  const allSpecialties: SpecialtyT[] = [
    { id: 'any_specialty_id', teamId: selectedTeamId, name: t('any'), deleted: false },
    ...specialties,
  ];

  const getStaffingSpecialtyName = (specialtyId: string | null): string => {
    if (specialtyId === null) return t('any');
    return specialties.find((s) => s.id === specialtyId)?.name ?? t('not_applicable');
  };

  const availableSpecialties = allSpecialties.filter(
    (sp) =>
      !form.staffing.some((s) => s.specialtyId === (sp.id === 'any_specialty_id' ? null : sp.id)),
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-full flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* General section */}
          <SectionLabel label={t('section_general')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label={t('color')} htmlFor="edit-shift-color">
              <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="edit-shift-color-trigger"
                  >
                    <span
                      className="block h-5 w-8 rounded-sm"
                      style={{
                        backgroundColor: ShiftColorMappings[form.color]?.sample || '#ccc',
                      }}
                    />
                    <span className="text-sm">{form.color}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" side="bottom" className="w-auto p-2">
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(ShiftColorMappings).map((colorKey) => (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => {
                          patch({ color: colorKey });
                          setColorPickerOpen(false);
                        }}
                        className="m-0.5 h-[30px] w-[30px] min-w-0 cursor-pointer rounded-full border-none p-0 hover:scale-110"
                        style={{ backgroundColor: ShiftColorMappings[colorKey].sample }}
                        data-testid={`edit-shift-color-option-${colorKey}`}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </FieldRow>
            <FieldRow label={t('name')} htmlFor="edit-shift-name">
              <Input
                id="edit-shift-name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                data-testid="edit-shift-name-input"
              />
            </FieldRow>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label={t('acronym')} htmlFor="edit-shift-acronym">
              <Input
                id="edit-shift-acronym"
                value={form.acronym}
                onChange={(e) => patch({ acronym: e.target.value })}
                data-testid="edit-shift-acronym-input"
              />
            </FieldRow>
            <div className="flex items-end pb-0.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-shift-acronym-custom"
                  checked={form.acronymCustom}
                  onCheckedChange={(checked) => patch({ acronymCustom: !!checked })}
                  data-testid="edit-shift-acronym-custom-checkbox"
                />
                <Label htmlFor="edit-shift-acronym-custom" className="cursor-pointer text-sm">
                  {t('acronym_custom')}
                </Label>
              </div>
            </div>
          </div>

          {/* Schedule section */}
          <SectionLabel label={t('section_schedule')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label={t('start_time')} htmlFor="edit-shift-start-time">
              <Select
                value={String(form.startTime.valueOf())}
                onValueChange={(value) => patch({ startTime: dayjs.utc(Number(value)) })}
              >
                <SelectTrigger
                  id="edit-shift-start-time"
                  data-testid="edit-shift-start-time-select"
                >
                  <SelectValue>{form.startTime.format('HH:mm')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {startTimeSlots.map((time) => (
                    <SelectItem key={time.valueOf()} value={String(time.valueOf())}>
                      {time.format('HH:mm')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label={t('end_time')} htmlFor="edit-shift-end-time">
              <div className="flex items-center gap-2">
                <Select
                  value={String(form.endTime.valueOf())}
                  onValueChange={(value) => patch({ endTime: dayjs.utc(Number(value)) })}
                >
                  <SelectTrigger id="edit-shift-end-time" data-testid="edit-shift-end-time-select">
                    <SelectValue>{form.endTime.format('HH:mm')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {endTimeSlots.map((time) => (
                      <SelectItem key={time.valueOf()} value={String(time.valueOf())}>
                        {time.format('HH:mm')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm whitespace-nowrap">+</span>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  className="w-16"
                  value={extraDaysRaw}
                  aria-invalid={!!errors.extraDays}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setExtraDaysRaw(raw);
                    const v = parseInt(raw, 10);
                    if (!isNaN(v)) {
                      patch({ extraDays: Math.max(0, Math.min(30, v)) });
                      if (errors.extraDays) {
                        setErrors((prev) => {
                          const { extraDays: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }
                  }}
                  data-testid="edit-shift-extra-days-input"
                />
                <span className="text-sm whitespace-nowrap">{t('days')}</span>
              </div>
            </FieldRow>
          </div>
          {form.extraDays > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('days_helper')
                .replace('{startDay}', 'Monday')
                .replace('{startTime}', form.startTime.format('HH:mm'))
                .replace('{endDay}', 'Tuesday')
                .replace('{endTime}', form.endTime.format('HH:mm'))}
            </p>
          )}

          {/* Shift type (work shifts only) */}
          {!isRest && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldRow label={t('type')} htmlFor="edit-shift-type">
                <Select
                  value={String(form.shiftType)}
                  onValueChange={(value) => {
                    const newType = Number(value) as ShiftType;
                    const updates: Partial<FormState> = { shiftType: newType };
                    if (newType !== ShiftType.DUTY) updates.recuperationTime = 0;
                    patch(updates);
                  }}
                >
                  <SelectTrigger id="edit-shift-type" data-testid="edit-shift-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(ShiftType.NORMAL)}>{t('normal')}</SelectItem>
                    <SelectItem value={String(ShiftType.DUTY)}>{t('duty')}</SelectItem>
                    <SelectItem value={String(ShiftType.ON_CALL)}>{t('on_call')}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              {isDuty && (
                <FieldRow label={t('recuperation')} htmlFor="edit-shift-recuperation">
                  <Input
                    id="edit-shift-recuperation"
                    type="number"
                    min={0}
                    step={0.5}
                    value={recuperationTimeRaw}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setRecuperationTimeRaw(raw);
                      const v = Number(raw);
                      if (!isNaN(v)) {
                        patch({ recuperationTime: Math.max(0, v) });
                        if (errors.recuperationTime) {
                          setErrors((prev) => {
                            const { recuperationTime: _, ...rest } = prev;
                            return rest;
                          });
                        }
                      }
                    }}
                    data-testid="edit-shift-recuperation-input"
                    aria-invalid={!!errors.recuperationTime}
                  />
                </FieldRow>
              )}
            </div>
          )}

          {/* Custom work time (work shifts only) */}
          {!isRest && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <Checkbox
                  id="edit-shift-use-custom-work-time"
                  checked={form.useCustomWorkTime}
                  onCheckedChange={(checked) => patch({ useCustomWorkTime: !!checked })}
                  data-testid="edit-shift-use-custom-work-time-checkbox"
                />
                <Label htmlFor="edit-shift-use-custom-work-time" className="cursor-pointer text-sm">
                  {t('use_custom_work_time')}
                </Label>
              </div>
              {form.useCustomWorkTime && (
                <div className="ml-6 grid grid-cols-2 gap-4">
                  <FieldRow label={t('hours')} htmlFor="edit-shift-custom-work-time-hours">
                    <Input
                      id="edit-shift-custom-work-time-hours"
                      type="number"
                      min={0}
                      value={customWorkTimeHoursRaw}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setCustomWorkTimeHoursRaw(raw);
                        const hours = parseInt(raw, 10);
                        if (!isNaN(hours)) {
                          const mins = form.customWorkTimeMinutes % 60;
                          patch({ customWorkTimeMinutes: Math.max(0, hours) * 60 + mins });
                          if (errors.customWorkTimeHours) {
                            setErrors((prev) => {
                              const { customWorkTimeHours: _, ...rest } = prev;
                              return rest;
                            });
                          }
                        }
                      }}
                      data-testid="edit-shift-custom-work-time-hours"
                      aria-invalid={!!errors.customWorkTimeHours}
                    />
                  </FieldRow>
                  <FieldRow label={t('minutes')} htmlFor="edit-shift-custom-work-time-minutes">
                    <Input
                      id="edit-shift-custom-work-time-minutes"
                      type="number"
                      min={0}
                      max={59}
                      value={customWorkTimeMinutesRaw}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setCustomWorkTimeMinutesRaw(raw);
                        const mins = parseInt(raw, 10);
                        if (!isNaN(mins)) {
                          const hours = Math.floor(form.customWorkTimeMinutes / 60);
                          patch({
                            customWorkTimeMinutes: hours * 60 + Math.min(59, Math.max(0, mins)),
                          });
                          if (errors.customWorkTimeMinutes) {
                            setErrors((prev) => {
                              const { customWorkTimeMinutes: _, ...rest } = prev;
                              return rest;
                            });
                          }
                        }
                      }}
                      data-testid="edit-shift-custom-work-time-minutes"
                      aria-invalid={!!errors.customWorkTimeMinutes}
                    />
                  </FieldRow>
                </div>
              )}
            </div>
          )}

          {/* Rest type (rest shifts only) */}
          {isRest && (
            <div className="mt-4">
              <FieldRow label={t('rest_type')} htmlFor="edit-shift-rest-type">
                <Select
                  value={String(form.restType)}
                  onValueChange={(value) => patch({ restType: Number(value) as ShiftRestType })}
                >
                  <SelectTrigger
                    id="edit-shift-rest-type"
                    data-testid="edit-shift-rest-type-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(ShiftRestType.OFF)}>{t('rest_type_off')}</SelectItem>
                    <SelectItem value={String(ShiftRestType.RECUPERATION)}>
                      {t('rest_type_recuperation')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
          )}

          {/* Staffing section (work shifts only) */}
          {!isRest && (
            <>
              <SectionLabel label={t('section_staffing')} />
              <div className="flex flex-col gap-2">
                {form.staffing.map((s) => (
                  <div key={s.specialtyId ?? 'any'} className="flex items-center gap-2">
                    <span className="min-w-[6rem] text-sm">
                      {getStaffingSpecialtyName(s.specialtyId)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleStaffingCountChange(s.specialtyId, -1)}
                        data-testid={`edit-shift-staffing-decrease-${s.specialtyId ?? 'any'}`}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">{s.staffing}</span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleStaffingCountChange(s.specialtyId, 1)}
                        data-testid={`edit-shift-staffing-increase-${s.specialtyId ?? 'any'}`}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveStaffing(s.specialtyId)}
                      data-testid={`edit-shift-staffing-remove-${s.specialtyId ?? 'any'}`}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
                {availableSpecialties.length > 0 && (
                  <div className="mt-1">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const specialtyId = value === 'any_specialty_id' ? null : value;
                        handleAddStaffing(specialtyId);
                      }}
                    >
                      <SelectTrigger
                        className="w-full"
                        data-testid="edit-shift-staffing-add-select"
                      >
                        <SelectValue placeholder={t('add')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSpecialties.map((sp) => (
                          <SelectItem key={sp.id} value={sp.id}>
                            {sp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Custom attributes section */}
          {shiftDimensions.length > 0 && (
            <>
              <SectionLabel label={t('section_attributes')} />
              <div className="flex flex-col gap-3">
                {shiftDimensions.map((dim) => (
                  <AttributeRow
                    key={dim.id}
                    dim={dim}
                    dimEntries={dimEntries.filter((de) => de.dimensionId === dim.id)}
                    value={getAttributeValue(dim)}
                    attribute={form.changedAttributes.get(dim.id) ?? getAttributeForDim(dim)}
                    onChange={(value) => handleAttributeChange(dim, value)}
                    onChangeAttribute={(attribute) =>
                      patch({
                        changedAttributes: new Map(form.changedAttributes).set(dim.id, attribute),
                      })
                    }
                  />
                ))}
              </div>
            </>
          )}

          <div className="h-4" />
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} data-testid="edit-shift-cancel-button">
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} data-testid="edit-shift-save-button">
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
  onChange: (value: string | number | boolean) => void;
  onChangeAttribute: (attribute: AttributeT) => void;
}

function AttributeRow({
  dim,
  dimEntries,
  value,
  attribute,
  onChange,
  onChangeAttribute,
}: AttributeRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="min-w-[6rem] shrink-0 text-sm font-medium">{dim.name}</Label>
      <div className="flex-1">
        {dim.entryType === DimensionEntryType.BOOL ? (
          <Checkbox
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(!!checked)}
            data-testid={`edit-shift-attr-bool-${dim.id}`}
          />
        ) : dim.entryType === DimensionEntryType.INT ? (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
            data-testid={`edit-shift-attr-int-${dim.id}`}
          />
        ) : dim.entryType === DimensionEntryType.DIM_ENTRIES ? (
          <DimEntriesSelector
            attribute={attribute}
            dimEntries={dimEntries}
            onChangeAttribute={onChangeAttribute}
          />
        ) : (
          <Input
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
            data-testid={`edit-shift-attr-str-${dim.id}`}
          />
        )}
      </div>
    </div>
  );
}

function DimEntriesSelector({
  attribute,
  dimEntries,
  onChangeAttribute,
}: {
  attribute: AttributeT;
  dimEntries: DimEntryT[];
  onChangeAttribute: (attribute: AttributeT) => void;
}) {
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
            data-testid={`edit-shift-attr-dim-entry-${entry.id}`}
          >
            {entry.name}
          </Badge>
        );
      })}
    </div>
  );
}
