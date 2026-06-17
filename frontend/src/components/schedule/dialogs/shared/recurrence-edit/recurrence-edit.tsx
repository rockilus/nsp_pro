import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../../../app/i18n/client';
// shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
// Types
import {
  OccurrenceType,
  FrequencyType,
  MonthRepeatType,
  RecurrenceEndType,
  RecurrenceRuleT,
  OccurrenceInfoT,
} from '../../../../../types/recurrence';

dayjs.extend(utc);

interface RecurrenceEditProps {
  lng: string;
  isEditing: boolean;
  occurrenceType: OccurrenceType;
  recurrenceRule?: RecurrenceRuleT | null;
  startDate: dayjs.Dayjs;
  teamId: string;
  onClose: () => void;
  onRecurrenceChange: (recurrence: RecurrenceRuleT) => void;
}

const RecurrenceEdit: React.FC<RecurrenceEditProps> = ({
  lng,
  isEditing,
  occurrenceType,
  recurrenceRule,
  startDate,
  teamId,
  onClose,
  onRecurrenceChange,
}) => {
  const { t } = useTranslation(lng, 'schedule-page');

  interface FormState {
    repeatEvery: number;
    frequencyType: FrequencyType;
    weekDays: number[];
    monthRepeatType: MonthRepeatType | null;
    recurrenceEndType: RecurrenceEndType;
    endDate: dayjs.Dayjs;
    numberOfOccurrences: number;
  }

  const [formState, setFormState] = useState<FormState>(() => ({
    repeatEvery: recurrenceRule?.repeatEvery || 1,
    frequencyType:
      recurrenceRule?.frequencyType !== undefined
        ? recurrenceRule.frequencyType
        : FrequencyType.WEEK,
    weekDays: recurrenceRule?.weekDays || [(startDate.day() + 6) % 7],
    monthRepeatType: recurrenceRule?.monthRepeatType || null,
    recurrenceEndType: recurrenceRule?.recurrenceEndType || RecurrenceEndType.NEVER,
    endDate: recurrenceRule?.endDate || startDate.add(3, 'month'),
    numberOfOccurrences: recurrenceRule?.numberOfOccurrences || 12,
  }));

  const [repeatEveryError, setRepeatEveryError] = useState<boolean>(false);
  const [numberOfOccurrencesError, setNumberOfOccurrencesError] = useState<boolean>(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setFormState((prev) => ({
        ...prev,
        repeatEvery: recurrenceRule?.repeatEvery || 1,
        frequencyType:
          recurrenceRule?.frequencyType !== undefined
            ? recurrenceRule.frequencyType
            : FrequencyType.WEEK,
        weekDays: recurrenceRule?.weekDays || [(startDate.day() + 6) % 7],
        monthRepeatType: recurrenceRule?.monthRepeatType || null,
        recurrenceEndType: recurrenceRule?.recurrenceEndType || RecurrenceEndType.NEVER,
        endDate: recurrenceRule?.endDate || startDate.add(3, 'month'),
        numberOfOccurrences: recurrenceRule?.numberOfOccurrences || 12,
      }));
    }, 0);

    return () => window.clearTimeout(id);
  }, [recurrenceRule, startDate]);

  const handleWeekDayToggle = (day: number) => {
    setFormState((prev) => ({
      ...prev,
      weekDays: prev.weekDays.includes(day)
        ? prev.weekDays.filter((d) => d !== day)
        : [...prev.weekDays, day],
    }));
  };

  const handleSubmit = () => {
    let hasError = false;

    if (!formState.repeatEvery || formState.repeatEvery === 0) {
      setRepeatEveryError(true);
      hasError = true;
    }

    if (
      formState.recurrenceEndType === RecurrenceEndType.NUMBER_OF_OCCURRENCES &&
      (!formState.numberOfOccurrences || formState.numberOfOccurrences === 0)
    ) {
      setNumberOfOccurrencesError(true);
      hasError = true;
    }

    if (hasError) return;

    const updatedRecurrence: RecurrenceRuleT = {
      id: recurrenceRule?.id || '',
      teamId,
      occurrenceType,
      occurrenceInfo: {
        shiftId: null,
        workerId: null,
        count: null,
      } as OccurrenceInfoT,
      repeatEvery: formState.repeatEvery,
      frequencyType: formState.frequencyType,
      weekDays: formState.weekDays,
      monthRepeatType:
        formState.frequencyType === FrequencyType.MONTH
          ? formState.monthRepeatType
            ? formState.monthRepeatType
            : MonthRepeatType.DAY_IN_MONTH
          : null,
      recurrenceEndType: formState.recurrenceEndType,
      startDate,
      endDate:
        formState.recurrenceEndType === RecurrenceEndType.END_DATE ? formState.endDate : null,
      numberOfOccurrences:
        formState.recurrenceEndType === RecurrenceEndType.NUMBER_OF_OCCURRENCES
          ? formState.numberOfOccurrences
          : null,
    };

    onRecurrenceChange(updatedRecurrence);
  };

  const handleCancel = () => {
    onClose();
  };

  const frequencyOptions = [
    { value: FrequencyType.DAY, label: t('day').toLowerCase(), testId: 'day' },
    { value: FrequencyType.WEEK, label: t('week').toLowerCase(), testId: 'week' },
    { value: FrequencyType.MONTH, label: t('month').toLowerCase(), testId: 'month' },
    { value: FrequencyType.YEAR, label: t('year').toLowerCase(), testId: 'year' },
  ];

  const weekDayOptions = [
    { value: 0, label: t('monday_short'), fullDayName: t('monday') },
    { value: 1, label: t('tuesday_short'), fullDayName: t('tuesday') },
    { value: 2, label: t('wednesday_short'), fullDayName: t('wednesday') },
    { value: 3, label: t('thursday_short'), fullDayName: t('thursday') },
    { value: 4, label: t('friday_short'), fullDayName: t('friday') },
    { value: 5, label: t('saturday_short'), fullDayName: t('saturday') },
    { value: 6, label: t('sunday_short'), fullDayName: t('sunday') },
  ];

  const ordinalTranslation: Record<number, string> = {
    1: t('first'),
    2: t('second'),
    3: t('third'),
    4: t('fourth'),
    5: t('fifth'),
  };

  const monthRepeatOptions = [
    {
      value: MonthRepeatType.DAY_IN_MONTH,
      label: `${t('Monthly on day')} ${startDate.date()}`,
    },
    {
      value: MonthRepeatType.WEEKDAY,
      label: `${t('Monthly on the')} ${ordinalTranslation[Math.ceil(startDate.date() / 7)]} ${
        weekDayOptions.find((day) => day.value === (startDate.day() + 6) % 7)?.fullDayName
      } `,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-1" data-testid="recurrence-edit-container">
      <h2 className="text-base font-semibold">{t('recurrence')}</h2>

      {/* Repeat every + frequency */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t('repeat_every')}</Label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={1}
            value={formState.repeatEvery === 0 ? '' : formState.repeatEvery}
            onChange={(e) => {
              setFormState((prev) => ({
                ...prev,
                repeatEvery: e.target.value === '' ? 0 : Number(e.target.value),
              }));
              setRepeatEveryError(false);
            }}
            aria-invalid={repeatEveryError}
            data-testid="repeat-every-input"
            className="h-8 w-14 [appearance:textfield] text-right text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Select
            value={String(formState.frequencyType)}
            onValueChange={(value) =>
              setFormState((prev) => ({
                ...prev,
                frequencyType: Number(value) as FrequencyType,
              }))
            }
          >
            <SelectTrigger className="h-8 w-24 text-xs" data-testid="frequency-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={String(option.value)}
                  data-testid={`frequency-option-${option.testId}`}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week day selector */}
      {formState.frequencyType === FrequencyType.WEEK && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t('repeat_on')}</Label>
          <div className="flex flex-wrap gap-1">
            {weekDayOptions.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleWeekDayToggle(day.value)}
                data-testid={`weekday-button-${day.value}`}
                className={`inline-flex size-7 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                  formState.weekDays.includes(day.value)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-transparent hover:bg-muted'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Month repeat type */}
      {formState.frequencyType === FrequencyType.MONTH && (
        <div className="space-y-1.5">
          <Select
            value={String(formState.monthRepeatType || MonthRepeatType.DAY_IN_MONTH)}
            onValueChange={(value) => {
              setFormState((prev) => ({
                ...prev,
                monthRepeatType: Number(value) as MonthRepeatType,
              }));
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs" data-testid="month-repeat-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthRepeatOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Ends */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('ends')}</Label>
        <RadioGroup
          value={String(formState.recurrenceEndType)}
          onValueChange={(value) =>
            setFormState((prev) => ({
              ...prev,
              recurrenceEndType: Number(value) as RecurrenceEndType,
            }))
          }
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value={String(RecurrenceEndType.NEVER)}
              id="end-never"
              data-testid="recurrence-never-radio"
            />
            <Label htmlFor="end-never" className="cursor-pointer text-sm font-normal">
              {t('never')}
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <RadioGroupItem
              value={String(RecurrenceEndType.END_DATE)}
              id="end-date"
              data-testid="recurrence-end-date-radio"
            />
            <Label htmlFor="end-date" className="cursor-pointer text-sm font-normal">
              {t('on')}
            </Label>
            <DatePicker
              value={formState.endDate}
              onChange={(newDate) => {
                setFormState((prev) => ({
                  ...prev,
                  endDate: newDate || startDate.add(3, 'month'),
                }));
              }}
              minDate={startDate}
              disabled={formState.recurrenceEndType !== RecurrenceEndType.END_DATE}
              data-testid="recurrence-end-date-picker"
              className="w-46"
            />
          </div>

          <div className="flex items-center gap-2">
            <RadioGroupItem
              value={String(RecurrenceEndType.NUMBER_OF_OCCURRENCES)}
              id="end-occurrences"
              data-testid="recurrence-occurrences-radio"
            />
            <Label htmlFor="end-occurrences" className="cursor-pointer text-sm font-normal">
              {t('after')}
            </Label>
            <Input
              type="number"
              min={1}
              disabled={formState.recurrenceEndType !== RecurrenceEndType.NUMBER_OF_OCCURRENCES}
              value={formState.numberOfOccurrences === 0 ? '' : formState.numberOfOccurrences}
              onChange={(e) => {
                setFormState((prev) => ({
                  ...prev,
                  numberOfOccurrences: e.target.value === '' ? 0 : Number(e.target.value),
                }));
                setNumberOfOccurrencesError(false);
              }}
              aria-invalid={numberOfOccurrencesError}
              data-testid="recurrence-occurrences-input"
              className="h-8 w-14 [appearance:textfield] text-right text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-sm">{t('occurrences').toLocaleLowerCase()}</span>
          </div>
        </RadioGroup>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          data-testid="recurrence-cancel-button"
        >
          {t('cancel')}
        </Button>
        <Button size="sm" onClick={handleSubmit} data-testid="recurrence-done-button">
          {t('ok')}
        </Button>
      </div>
    </div>
  );
};

export default RecurrenceEdit;
