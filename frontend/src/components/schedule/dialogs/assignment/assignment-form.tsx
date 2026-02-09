import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import { Button, MenuItem, Select, Box } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import RecurrenceEdit from "../shared/recurrence-edit/recurrence-edit";
import RecurrenceDeleteDialog from "../shared/recurrence-delete-dialog";
import { ReplacementDetailsDialog } from "../shared/replacement-details-dialog";
import { ReplacementCandidatesList } from "../shared/replacement-candidates-list";
// Hooks
import { useGetReplacementCandidates } from "../../../../hooks/useAssignment";
// Styles
import "../../lhs-tabs/edit-assignment.css";
// Types
import { WorkerT } from "../../../../types/worker";
import { ShiftT } from "../../../../types/shift";
import { ScheduleT } from "../../../../types/schedule";
import { AssignmentT, AssignmentSource } from "@/types/assignment";
import { AssignmentDataT } from "../../../../types/schedule";
import {
  RecurrenceRuleT,
  OccurrenceType,
  FrequencyType,
  MonthRepeatType,
  RecurrenceEndType,
  RecurrenceUpdateScope,
} from "../../../../types/recurrence";
import { ReplacementCandidateT } from "../../../../types/replacement";
import { DialogMode } from "../schedule-item-types";

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
  ) => void;
  onDelete: (
    assignmentId: string,
    recurrenceId: string | null,
    updateScope: RecurrenceUpdateScope | null,
  ) => void;
  onCancel: () => void;
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
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const isEditing = mode === DialogMode.EDIT;
  const assignment = assignmentData?.assignment;
  const recurrence = assignmentData?.recurrence ?? null;

  const [workerId, setWorkerId] = useState<string | null>(
    isEditing && assignment
      ? assignment.workerId
      : (initialData?.workerId ?? null),
  );
  const [shiftId, setShiftId] = useState<string | null>(
    isEditing && assignment
      ? assignment.shiftId
      : (initialData?.shiftId ?? null),
  );
  const [date, setDate] = useState<Dayjs | null>(
    isEditing && assignment ? assignment.date : (initialData?.date ?? null),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workerError, setWorkerError] = useState(false);
  const [shiftError, setShiftError] = useState(false);
  const [dateError, setDateError] = useState(false);

  const [recurrenceState, setRecurrenceState] =
    useState<RecurrenceRuleT | null>(recurrence);

  const [showRecurrenceEdit, setShowRecurrenceEdit] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<RecurrenceUpdateScope | null>(
    null,
  );
  const [dialogAction, setDialogAction] = useState<"delete" | "update" | null>(
    null,
  );

  // Replacement state
  const [replacementCandidates, setReplacementCandidates] = useState<
    ReplacementCandidateT[] | null
  >(null);
  const [loadingReplacements, setLoadingReplacements] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [isReplacementViewOpen, setIsReplacementViewOpen] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] =
    useState<ReplacementCandidateT | null>(null);

  const getReplacementCandidates = useGetReplacementCandidates();

  useEffect(() => {
    if (isEditing && assignment) {
      setWorkerId(assignment.workerId);
      setShiftId(assignment.shiftId);
      setDate(assignment.date);
      setRecurrenceState(recurrence);
    } else if (initialData) {
      setWorkerId(initialData.workerId);
      setShiftId(initialData.shiftId);
      setDate(initialData.date);
    }
    setWorkerError(false);
    setShiftError(false);
    setDateError(false);
  }, [isEditing, assignment, initialData, recurrence]);

  // Reset replacement state when assignment changes
  useEffect(() => {
    setIsReplacementViewOpen(false);
    setSelectedCandidateId(null);
    setReplacementCandidates(null);
  }, [assignment?.id]);

  const describeRecurrenceRule = (rule: RecurrenceRuleT): string => {
    const weekdays = [
      t("monday"),
      t("tuesday"),
      t("wednesday"),
      t("thursday"),
      t("friday"),
      t("saturday"),
      t("sunday"),
    ];

    let description = "";

    switch (rule.frequencyType) {
      case FrequencyType.DAY:
        description =
          rule.repeatEvery === 1
            ? t("rec_daily")
            : `${t("rec_every")} ${rule.repeatEvery} ${t(
                "days",
              ).toLocaleLowerCase()}`;
        break;
      case FrequencyType.WEEK:
        const days = rule.weekDays.map((day) => weekdays[day]).join(", ");
        description =
          rule.repeatEvery === 1
            ? `${t("rec_weekly_on")} ${days}`
            : `${t("rec_every")} ${rule.repeatEvery} ${t(
                "rec_weeks_on",
              ).toLocaleLowerCase()} ${days}`;
        break;
      case FrequencyType.MONTH:
        if (rule.monthRepeatType === MonthRepeatType.DAY_IN_MONTH) {
          description =
            rule.repeatEvery === 1
              ? `${t("rec_monthly_on_day")} ${rule.startDate.date()}`
              : `${t("rec_every")} ${rule.repeatEvery} ${t(
                  "rec_months_on_day",
                ).toLocaleLowerCase()} ${rule.startDate.date()}`;
        } else if (rule.monthRepeatType === MonthRepeatType.WEEKDAY) {
          const weekNumber = Math.ceil(rule.startDate.date() / 7);
          description =
            rule.repeatEvery === 1
              ? `${t("rec_monthly_on")} ${ordinal(weekNumber)} ${
                  weekdays[rule.startDate.day()]
                }`
              : `${t("rec_every")} ${rule.repeatEvery} ${t(
                  "rec_months_on",
                ).toLocaleLowerCase()} ${ordinal(weekNumber)} ${
                  weekdays[rule.startDate.day()]
                }`;
        }
        break;
      case FrequencyType.YEAR:
        description =
          rule.repeatEvery === 1
            ? `${t("rec_annually_on")} ${rule.startDate.format("MMMM D")}`
            : `${t("rec_every")} ${rule.repeatEvery} ${t(
                "rec_years_on",
              ).toLocaleLowerCase()} ${rule.startDate.format("MMMM D")}`;
        break;
    }

    if (rule.recurrenceEndType === RecurrenceEndType.END_DATE && rule.endDate) {
      description += `, ${t(
        "rec_until",
      ).toLocaleLowerCase()} ${rule.endDate.format("D MMM YYYY")}`;
    } else if (
      rule.recurrenceEndType === RecurrenceEndType.NUMBER_OF_OCCURRENCES &&
      rule.numberOfOccurrences
    ) {
      description += `, ${rule.numberOfOccurrences} ${t(
        "rec_times",
      ).toLocaleLowerCase()}`;
    }

    return description;
  };

  const ordinal = (n: number): string => {
    const s = [
      t("ordinal_th"),
      t("ordinal_st"),
      t("ordinal_nd"),
      t("ordinal_rd"),
    ];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const handleRecurrenceChange = (updatedRecurrence: RecurrenceRuleT) => {
    setRecurrenceState(updatedRecurrence);
    setShowRecurrenceEdit(false);
  };

  const handleDeleteClick = () => {
    if (assignment && assignment.sourceId) {
      setDialogAction("delete");
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
      console.error("Failed to get replacement candidates:", error);
      alert("Failed to get replacement candidates. Please try again.");
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
      // Reset replacement state after successful update
      setIsReplacementViewOpen(false);
      setReplacementCandidates(null);
      setSelectedCandidateId(null);
      setShowDetailsDialog(false);
    } catch (error) {
      console.error("Failed to select replacement:", error);
      alert("Failed to select replacement. Please try again.");
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

    if (!workerId || !shiftId || !date) {
      return;
    }

    const newAssignment: AssignmentT = {
      id: assignment ? assignment.id : "",
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
      setDialogAction("update");
      setIsDialogOpen(true);
    } else {
      try {
        setIsSubmitting(true);
        onSave(newAssignment, recurrenceState, null);
      } catch (error) {
        console.error("Failed to save assignment:", error);
        alert("Failed to save assignment. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDialogConfirm = (scope: RecurrenceUpdateScope) => {
    if (dialogAction === "delete" && assignment) {
      onDelete(assignment.id, assignment.sourceId, scope);
    } else if (dialogAction === "update" && assignment) {
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

  return (
    <Box>
      <div className="form">
        <span className="form-title">{t("worker")}</span>
        <Select
          className="edit-assignment-select"
          value={workerId || ""}
          onChange={(e) => {
            setWorkerError(false);
            setWorkerId(e.target.value);
          }}
          fullWidth
          error={workerError}
          displayEmpty
          data-testid="edit-assignment-worker-select"
          renderValue={(selected) => {
            if (selected === "") {
              return (
                <span className="edit-assignment-select-placeholder">
                  {t("select_a_worker")}
                </span>
              );
            }
            const selectedWorker = workers.find((w) => w.id === selected);
            return (
              <span className="edit-assignment-select-text">
                {selectedWorker ? selectedWorker.name : ""}
              </span>
            );
          }}
        >
          {workers
            .filter((w) => !w.deleted)
            .map((w) => (
              <MenuItem key={w.id} value={w.id} sx={{ fontSize: "0.9rem" }}>
                {w.name}
              </MenuItem>
            ))}
        </Select>
        <span className="form-title">{t("date")}</span>
        <DatePicker
          className="edit-assignment-datepicker"
          value={date}
          timezone="UTC"
          onChange={(newDate) => {
            setDateError(false);
            setDate(newDate ? newDate.startOf("day") : null);
          }}
          slotProps={{
            textField: {
              fullWidth: true,
              error: dateError,
              helperText: dateError ? t("edit-assignment.date-error") : "",
              inputProps: { "data-testid": "edit-assignment-date-picker" },
            },
          }}
        />
        {showRecurrenceEdit ? (
          <>
            <hr className="separator" />
            <RecurrenceEdit
              lng={lng}
              isEditing={true}
              occurrenceType={OccurrenceType.ASSIGNMENT}
              recurrenceRule={recurrenceState}
              startDate={date || dayjs()}
              teamId={teamId}
              onClose={() => {
                setShowRecurrenceEdit(false);
              }}
              onRecurrenceChange={handleRecurrenceChange}
            />
            <hr className="separator" />
          </>
        ) : (
          <button
            className="recurrence-button"
            onClick={() => setShowRecurrenceEdit(!showRecurrenceEdit)}
            data-testid="recurrence-button"
          >
            {recurrenceState
              ? describeRecurrenceRule(recurrenceState)
              : t("add_recurrence")}
          </button>
        )}
        <span className="form-title">{t("shift")}</span>
        <Select
          className="edit-assignment-select"
          value={shiftId || ""}
          onChange={(e) => {
            setShiftError(false);
            setShiftId(e.target.value);
          }}
          fullWidth
          error={shiftError}
          displayEmpty
          data-testid="edit-assignment-shift-select"
          renderValue={(selected) => {
            if (selected === "") {
              return (
                <span className="edit-assignment-select-placeholder">
                  {t("select_a_shift")}
                </span>
              );
            }
            const selectedShift = shifts.find((s) => s.id === selected);
            return (
              <span className="edit-assignment-select-text">
                {selectedShift ? selectedShift.name : ""}
              </span>
            );
          }}
        >
          {shifts.map((s) => (
            <MenuItem
              key={s.id}
              value={s.id}
              sx={{ fontSize: "0.9rem" }}
              data-testid={`shift-option-${s.id}`}
            >
              {s.name}
            </MenuItem>
          ))}
        </Select>
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

      <div className="edit-assignment-actions">
        {!isEditing ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveClick}
            disabled={isSubmitting}
            className="create-button"
            data-testid="edit-assignment-create-button"
          >
            {isSubmitting ? t("creating") : t("create")}
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteClick}
              className="delete-button"
              data-testid="delete-assignment-button"
            >
              {t("delete")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveClick}
              disabled={isSubmitting}
              className="save-button"
              data-testid="save-assignment-button"
            >
              {isSubmitting ? t("saving") : t("save")}
            </Button>
          </>
        )}
      </div>

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
    </Box>
  );
};

export default AssignmentForm;
