import React, { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../../app/i18n/client';
// shadcn
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import { FormActions } from '@/components/common/form-layout';
import { User, Briefcase, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
// Components
import RecurrenceEdit from '../shared/recurrence-edit/recurrence-edit';
import RecurrenceDeleteDialog from '../shared/recurrence-delete-dialog';
import { ReplacementDetailsDialog } from '../shared/replacement-details-dialog';
import { ReplacementCandidatesList } from '../shared/replacement-candidates-list';
// Hooks
import { useGetReplacementCandidates } from '../../../../hooks/useAssignment';
// Constants
import { ShiftColorMappings } from '../../../../constants/constants';
// Types
import { WorkerT } from '../../../../types/worker';
import { ShiftT, ShiftType } from '../../../../types/shift';
import { ScheduleT } from '../../../../types/schedule';
import { AssignmentT, AssignmentSource } from '@/types/assignment';
import { AssignmentDataT } from '../../../../types/schedule';
import {
  RecurrenceRuleT,
  OccurrenceType,
  FrequencyType,
  MonthRepeatType,
  RecurrenceEndType,
  RecurrenceUpdateScope,
} from '../../../../types/recurrence';
import { ReplacementCandidateT } from '../../../../types/replacement';
import { DialogMode } from '../schedule-item-types';

dayjs.extend(utc);

interface AssignmentFormProps {
  lng: string;
  mode: DialogMode;
  teamId: string;
  scheduleId: string | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  assignmentData: AssignmentDataT | null;
  initialData: {
    workerId: string | null;
    shiftId: string | null;
    date: Dayjs | null;
    scheduleId: string | null;
    addDemandActive?: boolean;
  } | null;
  useSolver: boolean;
  onSave: (
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null,
    updateScope: RecurrenceUpdateScope | null,
    options?: { keepOpen?: boolean },
  ) => void;
  onDelete: (
    assignmentId: string,
    recurrenceId: string | null,
    updateScope: RecurrenceUpdateScope | null,
  ) => void;
  onCancel: () => void;
  isLeader?: boolean;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
  lng,
  mode,
  teamId,
  scheduleId,
  workers,
  shifts,
  schedules,
  assignmentData,
  initialData,
  useSolver,
  onSave,
  onDelete,
  onCancel,
  isLeader = false,
}) => {
  const { t } = useTranslation(lng, 'schedule-page');

  const isEditing = mode === DialogMode.EDIT;
  const assignment = assignmentData?.assignment;
  const recurrence = assignmentData?.recurrence ?? null;

  const [workerId, setWorkerId] = useState<string | null>(
    isEditing && assignment ? assignment.workerId : (initialData?.workerId ?? null),
  );
  const [shiftId, setShiftId] = useState<string | null>(
    isEditing && assignment ? assignment.shiftId : (initialData?.shiftId ?? null),
  );
  const [date, setDate] = useState<Dayjs | null>(
    isEditing && assignment ? assignment.date : (initialData?.date ?? null),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workerError, setWorkerError] = useState(false);
  const [shiftError, setShiftError] = useState(false);
  const [dateError, setDateError] = useState(false);

  const [recurrenceState, setRecurrenceState] = useState<RecurrenceRuleT | null>(recurrence);
  const [showRecurrenceEdit, setShowRecurrenceEdit] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<RecurrenceUpdateScope | null>(null);
  const [dialogAction, setDialogAction] = useState<'delete' | 'update' | null>(null);

  // Replacement state
  const [replacementCandidates, setReplacementCandidates] = useState<
    ReplacementCandidateT[] | null
  >(null);
  const [loadingReplacements, setLoadingReplacements] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isReplacementViewOpen, setIsReplacementViewOpen] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ReplacementCandidateT | null>(null);

  const [localFixed, setLocalFixed] = useState<boolean | null>(
    assignment ? assignment.fixed : null,
  );

  const mobile = useIsMobile();
  const getReplacementCandidates = useGetReplacementCandidates();

  useEffect(() => {
    if (isEditing && assignment) {
      setWorkerId(assignment.workerId);
      setShiftId(assignment.shiftId);
      setDate(assignment.date);
      setRecurrenceState(recurrence);
      setLocalFixed(assignment.fixed);
    } else if (initialData) {
      setWorkerId(initialData.workerId);
      setShiftId(initialData.shiftId);
      setDate(initialData.date);
    }
    setWorkerError(false);
    setShiftError(false);
    setDateError(false);
  }, [isEditing, assignment, initialData, recurrence]);

  useEffect(() => {
    setLocalFixed(assignment ? assignment.fixed : null);
  }, [assignment]);

  useEffect(() => {
    setIsReplacementViewOpen(false);
    setSelectedCandidateId(null);
    setReplacementCandidates(null);
  }, [assignment?.id]);

  const describeRecurrenceRule = (rule: RecurrenceRuleT): string => {
    const weekdays = [
      t('monday'),
      t('tuesday'),
      t('wednesday'),
      t('thursday'),
      t('friday'),
      t('saturday'),
      t('sunday'),
    ];

    let description = '';

    switch (rule.frequencyType) {
      case FrequencyType.DAY:
        description =
          rule.repeatEvery === 1
            ? t('rec_daily')
            : `${t('rec_every')} ${rule.repeatEvery} ${t('days').toLocaleLowerCase()}`;
        break;
      case FrequencyType.WEEK:
        const days = rule.weekDays.map((day) => weekdays[day]).join(', ');
        description =
          rule.repeatEvery === 1
            ? `${t('rec_weekly_on')} ${days}`
            : `${t('rec_every')} ${rule.repeatEvery} ${t('rec_weeks_on').toLocaleLowerCase()} ${days}`;
        break;
      case FrequencyType.MONTH:
        if (rule.monthRepeatType === MonthRepeatType.DAY_IN_MONTH) {
          description =
            rule.repeatEvery === 1
              ? `${t('rec_monthly_on_day')} ${rule.startDate.date()}`
              : `${t('rec_every')} ${rule.repeatEvery} ${t('rec_months_on_day').toLocaleLowerCase()} ${rule.startDate.date()}`;
        } else if (rule.monthRepeatType === MonthRepeatType.WEEKDAY) {
          const weekNumber = Math.ceil(rule.startDate.date() / 7);
          description =
            rule.repeatEvery === 1
              ? `${t('rec_monthly_on')} ${ordinal(weekNumber)} ${weekdays[rule.startDate.day()]}`
              : `${t('rec_every')} ${rule.repeatEvery} ${t('rec_months_on').toLocaleLowerCase()} ${ordinal(weekNumber)} ${weekdays[rule.startDate.day()]}`;
        }
        break;
      case FrequencyType.YEAR:
        description =
          rule.repeatEvery === 1
            ? `${t('rec_annually_on')} ${rule.startDate.format('MMMM D')}`
            : `${t('rec_every')} ${rule.repeatEvery} ${t('rec_years_on').toLocaleLowerCase()} ${rule.startDate.format('MMMM D')}`;
        break;
    }

    if (rule.recurrenceEndType === RecurrenceEndType.END_DATE && rule.endDate) {
      description += `, ${t('rec_until').toLocaleLowerCase()} ${rule.endDate.format('D MMM YYYY')}`;
    } else if (
      rule.recurrenceEndType === RecurrenceEndType.NUMBER_OF_OCCURRENCES &&
      rule.numberOfOccurrences
    ) {
      description += `, ${rule.numberOfOccurrences} ${t('rec_times').toLocaleLowerCase()}`;
    }

    return description;
  };

  const ordinal = (n: number): string => {
    const s = [t('ordinal_th'), t('ordinal_st'), t('ordinal_nd'), t('ordinal_rd')];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const handleRecurrenceChange = (updatedRecurrence: RecurrenceRuleT) => {
    setRecurrenceState(updatedRecurrence);
    setShowRecurrenceEdit(false);
  };

  const handleDeleteClick = () => {
    if (assignment && assignment.sourceId) {
      setDialogAction('delete');
      setIsDialogOpen(true);
    } else if (assignment) {
      onDelete(assignment.id, null, null);
    }
  };

  const handleCheckReplacement = async () => {
    if (!assignment || !teamId) return;
    try {
      setLoadingReplacements(true);
      const candidates = await getReplacementCandidates(assignment.id, teamId);
      setReplacementCandidates(candidates);
      setSelectedCandidateId(null);
      setIsReplacementViewOpen(true);
    } catch (error) {
      console.error('Failed to get replacement candidates:', error);
      alert('Failed to get replacement candidates. Please try again.');
    } finally {
      setLoadingReplacements(false);
    }
  };

  const handleCancelReplacement = () => {
    setIsReplacementViewOpen(false);
    setSelectedCandidateId(null);
    setReplacementCandidates(null);
  };

  const handleSelectReplacement = async (candidateId?: string) => {
    const selectedWorkerId = candidateId || selectedCandidateId;
    if (!selectedWorkerId || !assignment) return;

    const updatedAssignment: AssignmentT = {
      ...assignment,
      workerId: selectedWorkerId,
    };

    try {
      setIsSubmitting(true);
      onSave(updatedAssignment, recurrenceState, null);
      setIsReplacementViewOpen(false);
      setReplacementCandidates(null);
      setSelectedCandidateId(null);
      setShowDetailsDialog(false);
      onCancel();
    } catch (error) {
      console.error('Failed to select replacement:', error);
      alert('Failed to select replacement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFixed = async () => {
    if (!isEditing || !assignment || isSubmitting) return;
    const newFixed = !Boolean(localFixed);
    const updatedAssignment: AssignmentT = {
      ...assignment,
      fixed: newFixed,
    };

    try {
      setLocalFixed(newFixed);
      setIsSubmitting(true);
      await Promise.resolve(onSave(updatedAssignment, recurrenceState, null, { keepOpen: true }));
    } catch (error) {
      console.error('Failed to toggle fixed:', error);
      alert('Failed to update assignment. Please try again.');
      setLocalFixed(assignment.fixed ?? null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCandidateDetailsClick = (candidate: ReplacementCandidateT) => {
    setSelectedCandidate(candidate);
    setShowDetailsDialog(true);
  };

  const handleSaveClick = async () => {
    if (!workerId) setWorkerError(true);
    if (!shiftId) setShiftError(true);
    if (!date) setDateError(true);

    if (!workerId || !shiftId || !date) return;

    const newAssignment: AssignmentT = {
      id: assignment ? assignment.id : '',
      teamId: teamId,
      scheduleId: scheduleId,
      workerId: workerId,
      date: date,
      shiftId: shiftId,
      fixed: true,
      source: AssignmentSource.MANUAL,
      referenceAssignmentId: null,
      sourceId: recurrenceState ? recurrenceState.id : null,
    };

    if (isEditing && assignment && assignment.sourceId) {
      setDialogAction('update');
      setIsDialogOpen(true);
    } else {
      try {
        setIsSubmitting(true);
        onSave(newAssignment, recurrenceState, null);
      } catch (error) {
        console.error('Failed to save assignment:', error);
        alert('Failed to save assignment. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDialogConfirm = (scope: RecurrenceUpdateScope) => {
    if (dialogAction === 'delete' && assignment) {
      onDelete(assignment.id, assignment.sourceId, scope);
    } else if (dialogAction === 'update' && assignment) {
      const updatedAssignment: AssignmentT = {
        ...assignment,
        workerId: workerId || assignment.workerId,
        shiftId: shiftId || assignment.shiftId,
        date: date || assignment.date,
      };
      onSave(updatedAssignment, recurrenceState, scope);
    }
    setIsDialogOpen(false);
    setDialogAction(null);
  };

  // Partition shifts into work (Normal + Duty) and non-work (Rest + Leave)
  const workShifts = shifts.filter(
    (s) => !s.deleted && (s.shiftType === ShiftType.NORMAL || s.shiftType === ShiftType.DUTY),
  );
  const nonWorkShifts = shifts.filter(
    (s) => !s.deleted && (s.shiftType === ShiftType.REST || s.shiftType === ShiftType.LEAVE),
  );

  return (
    <div data-testid="assignment-form" className="flex flex-col gap-5">
      {/* Fixed/unfixed chip (leader + editing + desktop) */}
      {isEditing && isLeader && !mobile && (
        <div className="flex justify-start">
          <Badge
            variant="secondary"
            onClick={handleToggleFixed}
            className="h-6 cursor-pointer select-none"
            data-testid="assignment-fixed-chip"
          >
            {localFixed ? 'Locked 🔒' : 'Unlocked 🔓'}
          </Badge>
        </div>
      )}

      {/* Worker select — icon inline left, no external label */}
      <div>
        <div className="relative">
          <User className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Select
            value={workerId || ''}
            onValueChange={(value) => {
              setWorkerError(false);
              setWorkerId(value);
            }}
          >
            <SelectTrigger
              data-testid="edit-assignment-worker-select"
              aria-invalid={workerError}
              className="w-full max-w-full pl-9"
            >
              <SelectValue placeholder={t('select_a_worker')} />
            </SelectTrigger>
            <SelectContent>
              {workers
                .filter((w) => !w.deleted)
                .map((w) => (
                  <SelectItem key={w.id} value={w.id} data-testid={`worker-option-${w.id}`}>
                    {w.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {workerError && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {' '}
          </p>
        )}
      </div>

      {/* Date picker — already has CalendarIcon built-in, full-width */}
      <div>
        <DatePicker
          value={date}
          onChange={(newDate) => {
            setDateError(false);
            setDate(newDate ? newDate.startOf('day') : null);
          }}
          error={dateError}
          data-testid="edit-assignment-date-picker"
          className="w-full max-w-full"
        />
        {dateError && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {t('edit-assignment.date-error')}
          </p>
        )}

        {/* Recurrence */}
        {showRecurrenceEdit ? (
          <Card
            size="sm"
            className="mt-2 border border-border shadow-none ring-0"
            data-testid="recurrence-card"
          >
            <CardContent>
              <RecurrenceEdit
                lng={lng}
                isEditing={true}
                occurrenceType={OccurrenceType.ASSIGNMENT}
                recurrenceRule={recurrenceState}
                startDate={date || dayjs()}
                teamId={teamId}
                onClose={() => setShowRecurrenceEdit(false)}
                onRecurrenceChange={handleRecurrenceChange}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="mt-1 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRecurrenceEdit(true)}
              data-testid="recurrence-button"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3" />
              {recurrenceState ? describeRecurrenceRule(recurrenceState) : t('add_recurrence')}
            </Button>
          </div>
        )}
      </div>

      {/* Shift select — icon inline left, grouped: work (normal vs duty) / non-work */}
      <div>
        <div className="relative">
          <Briefcase className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Select
            value={shiftId || ''}
            onValueChange={(value) => {
              setShiftError(false);
              setShiftId(value);
            }}
          >
            <SelectTrigger
              data-testid="edit-assignment-shift-select"
              aria-invalid={shiftError}
              className="w-full max-w-full pl-9"
            >
              <SelectValue placeholder={t('select_a_shift')} />
            </SelectTrigger>
            <SelectContent>
              {/* Work shifts group */}
              {workShifts.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{t('work_shifts')}</SelectLabel>
                  {workShifts.map((s) => {
                    const { sample } = ShiftColorMappings[s.color] || { sample: '#9e9e9e' };
                    const isDuty = s.shiftType === ShiftType.DUTY;
                    return (
                      <SelectItem key={s.id} value={s.id} data-testid={`shift-option-${s.id}`}>
                        <span className="flex items-center gap-2">
                          {/* Duty accent: colored left bar, matching schedule-table-shift pattern */}
                          {isDuty && (
                            <span
                              className="block w-1 self-stretch rounded-sm"
                              style={{
                                backgroundColor: sample,
                                minHeight: '1rem',
                                marginLeft: '-0.25rem',
                              }}
                            />
                          )}
                          {s.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              )}

              {/* Non-work shifts group */}
              {nonWorkShifts.length > 0 && (
                <>
                  {workShifts.length > 0 && <SelectSeparator />}
                  <SelectGroup>
                    <SelectLabel>{t('non_work_shifts')}</SelectLabel>
                    {nonWorkShifts.map((s) => (
                      <SelectItem key={s.id} value={s.id} data-testid={`shift-option-${s.id}`}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        {shiftError && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {' '}
          </p>
        )}
      </div>

      {/* Replacement candidates list */}
      {isEditing && (
        <ReplacementCandidatesList
          lng={lng}
          candidates={replacementCandidates}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={setSelectedCandidateId}
          onViewDetails={handleCandidateDetailsClick}
          onConfirmReplacement={handleSelectReplacement}
          onCheckReplacement={handleCheckReplacement}
          onCancel={handleCancelReplacement}
          isOpen={isReplacementViewOpen}
          isSubmitting={isSubmitting}
          isCheckingReplacement={loadingReplacements}
        />
      )}

      <FormActions>
        {isEditing ? (
          <>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              data-testid="delete-assignment-button"
            >
              {t('delete')}
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={isSubmitting}
              data-testid="save-assignment-button"
            >
              {isSubmitting ? t('saving') : t('save')}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSaveClick}
            disabled={isSubmitting}
            data-testid="edit-assignment-create-button"
          >
            {isSubmitting ? t('creating') : t('create')}
          </Button>
        )}
      </FormActions>

      <RecurrenceDeleteDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleDialogConfirm}
      />

      <ReplacementDetailsDialog
        open={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedCandidate(null);
        }}
        candidates={replacementCandidates || []}
        onReplace={handleSelectReplacement}
        isSubmitting={isSubmitting}
        lng={lng}
        assignment={assignment}
        workers={workers}
        shifts={shifts}
      />
    </div>
  );
};

export default AssignmentForm;
