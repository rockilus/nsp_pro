import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import {
  Button,
  MenuItem,
  Select,
  Chip,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import RecurrenceEdit from "./recurrence-edit/recurrence-edit";
import RecurrenceDeleteDialog from "./recurrence-delete-dialog";
import { ReplacementDetailsDialog } from "../replacement-details-dialog";
import { ReplacementCandidatesList } from "../replacement-candidates-list";
// Hooks
import { useGetReplacementCandidates } from "../../../hooks/useAssignment";
// Styles
import "./edit-assignment.css";
// Types
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import { AssignmentT, AssignmentSource } from "@/types/assignment";
import {
  RecurrenceRuleT,
  OccurrenceType,
  FrequencyType,
  MonthRepeatType,
  RecurrenceEndType,
  RecurrenceUpdateScope,
} from "../../../types/recurrence";
import { ReplacementCandidateT } from "../../../types/replacement";

dayjs.extend(utc);

interface EditAssignmentProps {
  lng: string;
  teamId: string;
  scheduleId: string | null;
  workerSelectedId: string | null;
  shiftSelectedId: string | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  dateSelected: Dayjs | null;
  handleCreateAssignment?: (
    newAssignment: AssignmentT,
    newRecurrence: RecurrenceRuleT | null,
  ) => void;
  isEditing?: boolean;
  assignment?: AssignmentT;
  handleUpdateAssignment?: (
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null,
  ) => void;
  handleDeleteAssignment?: (
    assignmentId: string,
    recurrenceId: string | null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null,
  ) => void;
  recurrence?: RecurrenceRuleT | null;
}

const EditAssignment: React.FC<EditAssignmentProps> = ({
  lng,
  teamId,
  scheduleId,
  workerSelectedId,
  shiftSelectedId,
  workers,
  shifts,
  dateSelected,
  handleCreateAssignment,
  isEditing = false,
  assignment,
  handleUpdateAssignment,
  handleDeleteAssignment,
  recurrence,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const [workerId, setWorkerId] = useState<string | null>(
    isEditing && assignment ? assignment.workerId : workerSelectedId,
  );
  const [shiftId, setShiftId] = useState<string | null>(
    isEditing && assignment ? assignment.shiftId : shiftSelectedId,
  );
  const [date, setDate] = useState<Dayjs | null>(
    isEditing && assignment ? assignment.date : dateSelected,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workerError, setWorkerError] = useState(false);
  const [shiftError, setShiftError] = useState(false);
  const [dateError, setDateError] = useState(false);

  const [recurrenceState, setRecurrenceState] =
    useState<RecurrenceRuleT | null>(recurrence ?? null);

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
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] =
    useState<ReplacementCandidateT | null>(null);

  const getReplacementCandidates = useGetReplacementCandidates();

  useEffect(() => {
    setWorkerId(workerSelectedId);
    setShiftId(shiftSelectedId);
    setDate(dateSelected);
    setWorkerError(false);
    setShiftError(false);
    setDateError(false);
    setRecurrenceState(recurrence ?? null);
  }, [workerSelectedId, shiftSelectedId, dateSelected, recurrence]);

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
    } else if (assignment && handleDeleteAssignment) {
      handleDeleteAssignment(assignment.id, null, null);
    }
  };

  const handleCheckReplacement = async () => {
    if (!assignment || !teamId) return;

    try {
      setLoadingReplacements(true);
      const candidates = await getReplacementCandidates(assignment.id, teamId);
      setReplacementCandidates(candidates);
      setSelectedCandidateId(null);
    } catch (error) {
      console.error("Failed to get replacement candidates:", error);
      alert("Failed to get replacement candidates. Please try again.");
    } finally {
      setLoadingReplacements(false);
    }
  };

  const handleSelectReplacement = async () => {
    if (!selectedCandidateId || !assignment || !handleUpdateAssignment) return;

    const updatedAssignment: AssignmentT = {
      ...assignment,
      workerId: selectedCandidateId,
    };

    try {
      setIsSubmitting(true);
      await handleUpdateAssignment(updatedAssignment, recurrenceState, null);
      // Reset replacement state after successful update
      setReplacementCandidates(null);
      setSelectedCandidateId(null);
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
        if (isEditing && assignment && handleUpdateAssignment) {
          await handleUpdateAssignment(newAssignment, recurrenceState, null);
        } else if (handleCreateAssignment) {
          await handleCreateAssignment(newAssignment, recurrenceState);
        }
      } catch (error) {
        console.error("Failed to save assignment:", error);
        alert("Failed to save assignment. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDialogConfirm = (scope: RecurrenceUpdateScope) => {
    if (dialogAction === "delete" && assignment && handleDeleteAssignment) {
      handleDeleteAssignment(assignment.id, assignment.sourceId, scope);
    } else if (
      dialogAction === "update" &&
      assignment &&
      handleUpdateAssignment
    ) {
      const updatedAssignment: AssignmentT = {
        ...assignment,
        workerId: workerId || assignment.workerId,
        shiftId: shiftId || assignment.shiftId,
        date: date || assignment.date,
      };
      handleUpdateAssignment(updatedAssignment, recurrenceState, scope);
    }
    setIsDialogOpen(false);
    setDialogAction(null);
  };

  return (
    <div className="edit-assignment-container">
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
          onChange={(newDate) => {
            setDateError(false);
            setDate(newDate ? dayjs(newDate).utc() : null);
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
            >
              {t("delete")}
            </Button>
            <Button
              variant="outlined"
              color="info"
              onClick={handleCheckReplacement}
              disabled={loadingReplacements}
              className="check-replacement-button"
              data-testid="check-replacement-button"
            >
              {loadingReplacements ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  {t("checking")}
                </>
              ) : (
                t("check_replacement")
              )}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveClick}
              disabled={isSubmitting}
              className="save-button"
            >
              {isSubmitting ? t("saving") : t("save")}
            </Button>
          </>
        )}
      </div>

      {/* Replacement candidates list */}
      {isEditing &&
        replacementCandidates &&
        replacementCandidates.length > 0 && (
          <ReplacementCandidatesList
            lng={lng}
            candidates={replacementCandidates}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={setSelectedCandidateId}
            onViewDetails={handleCandidateDetailsClick}
            onConfirmReplacement={handleSelectReplacement}
            isSubmitting={isSubmitting}
          />
        )}

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
        candidate={selectedCandidate}
        lng={lng}
      />
    </div>
  );
};

export default EditAssignment;
