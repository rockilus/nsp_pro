import React, { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../../app/i18n/client';
// shadcn
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField, FormActions } from '@/components/common/form-layout';
import { Briefcase, Calendar } from 'lucide-react';
// Types
import { ShiftT } from '../../../../types/shift';
import { SpecialtyT } from '@/types/specialty';
import { ShiftDemandDTO, ShiftDemandUpdateDTO } from '@/types/shiftDemand';
import { AssignmentT } from '@/types/assignment';
import { ScheduleCellDataT } from '../../../../types/schedule';
import { DialogMode } from '../schedule-item-types';

dayjs.extend(utc);

interface DemandFormProps {
  lng: string;
  mode: DialogMode;
  shifts: ShiftT[];
  specialties: SpecialtyT[];
  cellData: ScheduleCellDataT | null;
  initialData: {
    shiftId: string | null;
    date: Dayjs | null;
  } | null;
  onCreateDemand?: (
    shiftId: string,
    date: dayjs.Dayjs,
    count: number,
    notes?: string,
  ) => Promise<void>;
  onUpdateDemand?: (demandId: string, updates: Partial<ShiftDemandUpdateDTO>) => Promise<void>;
  onDeleteDemand?: (demandId: string) => Promise<void>;
  onCancel: () => void;
}

const DemandForm: React.FC<DemandFormProps> = ({
  lng,
  mode,
  shifts,
  specialties,
  cellData,
  initialData,
  onCreateDemand,
  onUpdateDemand,
  onDeleteDemand,
  onCancel,
}) => {
  const { t } = useTranslation(lng, 'schedule-page');

  const isEditing = mode === DialogMode.EDIT;

  // Extract data from cellData for edit mode
  const shiftDemand = cellData?.shiftDemandsData?.shiftDemand ?? null;
  const shift = isEditing
    ? (cellData?.shiftDemandsData?.shift ?? null)
    : (shifts.find((s) => s.id === initialData?.shiftId) ?? null);
  const date = isEditing
    ? shiftDemand
      ? dayjs.unix(shiftDemand.date)
      : null
    : (initialData?.date ?? null);
  const assignments: AssignmentT[] = isEditing
    ? (cellData?.assignmentsData.map((ad) => ad.assignment) ?? [])
    : [];

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(shift?.id ?? null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(date);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demandCount, setDemandCount] = useState<number>(shiftDemand?.count ?? 1);
  const [shiftError, setShiftError] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');

  useEffect(() => {
    if (isEditing && cellData) {
      setSelectedShiftId(cellData.shiftDemandsData?.shift?.id ?? null);
      if (cellData.shiftDemandsData?.shiftDemand) {
        setSelectedDate(dayjs.unix(cellData.shiftDemandsData.shiftDemand.date));
        setDemandCount(cellData.shiftDemandsData.shiftDemand.count);
      }
    } else if (initialData) {
      setSelectedShiftId(initialData.shiftId);
      setSelectedDate(initialData.date);
    }
  }, [isEditing, cellData, initialData]);

  const handleCreateClick = async () => {
    setShiftError('');
    setDateError('');

    let hasError = false;

    if (!selectedShiftId) {
      setShiftError(t('please_select_a_shift'));
      hasError = true;
    }

    if (!selectedDate) {
      setDateError(t('please_select_a_date'));
      hasError = true;
    }

    if (hasError || !onCreateDemand) return;

    setIsSubmitting(true);
    try {
      await onCreateDemand(selectedShiftId!, selectedDate!, 1, 'Direct requirement');
      onCancel();
    } catch (error) {
      console.error('Failed to create demand:', error);
      alert('Failed to create demand. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecreaseDSD = async () => {
    if (!shiftDemand || !onUpdateDemand || demandCount <= 1) return;

    const newCount = demandCount - 1;
    setDemandCount(newCount);
    try {
      await onUpdateDemand(shiftDemand.id, { count: newCount });
    } catch (error) {
      setDemandCount(demandCount);
      console.error('Failed to decrease demand:', error);
    }
  };

  const handleIncreaseDSD = async () => {
    if (!shiftDemand || !onUpdateDemand) return;

    const newCount = demandCount + 1;
    setDemandCount(newCount);
    try {
      await onUpdateDemand(shiftDemand.id, { count: newCount });
    } catch (error) {
      setDemandCount(demandCount);
      console.error('Failed to increase demand:', error);
    }
  };

  const handleDeleteDemands = async () => {
    if (!shiftDemand || !onDeleteDemand) return;
    await onDeleteDemand(shiftDemand.id);
    onCancel();
  };

  // ── Edit mode ──────────────────────────────────────────────────────────
  if (isEditing && shift && shiftDemand && selectedDate) {
    const assignmentsCount = assignments.length;
    const shiftStaffingTotal = shift.staffing.reduce(
      (sum: number, staffing) => sum + staffing.staffing,
      0,
    );
    const countActual =
      shiftStaffingTotal > 0 ? Math.floor(assignmentsCount / shiftStaffingTotal) : 0;

    return (
      <div className="flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold" data-testid="demand-shift-name">
            {shift.name}
          </span>
          <span
            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
            data-testid="demand-count-display"
          >
            {`${countActual} / ${demandCount}`}
          </span>
        </div>

        {/* Date & time */}
        <span className="text-sm text-muted-foreground">
          {selectedDate.format('D MMMM YYYY')}
          {' ⋅ '}
          {shift.startTime.format('HH:mm')}
          {' - '}
          {shift.endTime.format('HH:mm')}
          {!shift.endTime.isSame(shift.startTime, 'day') && <sup>+1</sup>}
        </span>

        {/* Demand count controls */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm font-medium">{t('demand')}</span>
          <span className="text-sm font-semibold" data-testid="demand-target-count">
            {demandCount}
          </span>
          <div className="inline-flex rounded-md shadow-xs">
            <button
              type="button"
              onClick={handleDecreaseDSD}
              data-testid="decrease-demand-button"
              className="inline-flex items-center justify-center rounded-l-md border border-input bg-transparent px-3 py-1 text-sm hover:bg-muted"
            >
              –
            </button>
            <button
              type="button"
              onClick={handleIncreaseDSD}
              data-testid="increase-demand-button"
              className="inline-flex items-center justify-center rounded-r-md border border-l-0 border-input bg-transparent px-3 py-1 text-sm hover:bg-muted"
            >
              +
            </button>
          </div>
        </div>

        {/* Staffing required breakdown */}
        <div className="space-y-1">
          <span className="mb-2 block text-sm font-medium">{t('staffing_required')}</span>
          {shift.staffing.map((staffing, index) => (
            <div key={`${staffing.specialtyId}-${index}`} className="flex items-center">
              <span className="flex-1 text-sm text-muted-foreground">
                {staffing.specialtyId
                  ? specialties.find((s) => s.id == staffing.specialtyId)?.name
                  : t('any')}
              </span>
              <span className="w-8 text-center text-sm text-muted-foreground">
                ({staffing.staffing})
              </span>
              <span className="w-16 text-right text-sm font-medium">
                {staffing.staffing * demandCount}
              </span>
            </div>
          ))}
          <div className="my-2 border-t border-border" />
          <div className="flex items-center">
            <span className="flex-1 text-sm font-semibold">{t('total')}</span>
            <span className="w-8 text-sm" />
            <span className="w-16 text-right text-sm font-semibold">
              {shift.staffing.reduce((sum: number, staffing) => sum + staffing.staffing, 0) *
                demandCount}
            </span>
          </div>
        </div>

        {/* Delete button */}
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={handleDeleteDemands}
            data-testid="delete-demand-button"
          >
            {t('delete')}
          </Button>
        </div>
      </div>
    );
  }

  // ── Create mode ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <FormField label={t('shift')} icon={Briefcase} error={shiftError}>
          <Select
            value={selectedShiftId || ''}
            onValueChange={(value) => {
              setSelectedShiftId(value);
              setShiftError('');
            }}
          >
            <SelectTrigger data-testid="demand-shift-select" aria-invalid={!!shiftError}>
              <SelectValue placeholder={t('select_a_shift')} />
            </SelectTrigger>
            <SelectContent>
              {shifts.map((s) => (
                <SelectItem key={s.id} value={s.id} data-testid={`demand-shift-option-${s.id}`}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t('date')} icon={Calendar} error={dateError}>
          <DatePicker
            value={selectedDate}
            onChange={(newDate) => {
              setSelectedDate(newDate ? dayjs(newDate).utc() : null);
              setDateError('');
            }}
            error={!!dateError}
            data-testid="demand-date-picker"
          />
        </FormField>
      </div>

      <FormActions>
        <Button variant="outline" onClick={onCancel} data-testid="cancel-demand-button">
          {t('cancel')}
        </Button>
        <Button
          onClick={handleCreateClick}
          disabled={isSubmitting}
          data-testid="create-demand-button"
        >
          {isSubmitting ? t('creating') : t('create')}
        </Button>
      </FormActions>
    </div>
  );
};

export default DemandForm;
