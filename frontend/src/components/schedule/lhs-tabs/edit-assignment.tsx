import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import { Button, MenuItem, Select, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import RecurrenceEdit from "./recurrence-edit/recurrence-edit";
// Styles
import "./edit-assignment.css";
// Types
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import { AssignmentT } from "../../../types/schedule";
import { RecurrenceRuleT, RecurrenceType } from "../../../types/recurrence";

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
  handleCreateAssignment?: (newAssignment: AssignmentT) => void;
  isEditing?: boolean;
  assignment?: AssignmentT;
  handleUpdateAssignment?: (assignment: AssignmentT) => void;
  handleDeleteAssignment?: (assignmentId: string) => void;
  recurrenceRule?: RecurrenceRuleT | null;
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
  recurrenceRule,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const [workerId, setWorkerId] = useState<string | null>(
    isEditing && assignment ? assignment.workerId : workerSelectedId // Updated to use worker ID state
  );
  const [shiftId, setShiftId] = useState<string | null>(
    isEditing && assignment ? assignment.shiftId : shiftSelectedId // Updated to use shift ID state
  );
  const [date, setDate] = useState<Dayjs | null>(
    isEditing && assignment ? assignment.date : dateSelected
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workerError, setWorkerError] = useState(false);
  const [shiftError, setShiftError] = useState(false);
  const [dateError, setDateError] = useState(false);

  const [recurrenceRuleState, setRecurrenceRuleState] =
    useState<RecurrenceRuleT | null>(recurrenceRule ?? null);

  const [showRecurrenceEdit, setShowRecurrenceEdit] = useState(false); // State to toggle recurrence edit visibility

  useEffect(() => {
    setWorkerId(workerSelectedId);
    setShiftId(shiftSelectedId);
    setDate(dateSelected);
    setWorkerError(false);
    setShiftError(false);
    setDateError(false);
    setRecurrenceRuleState(recurrenceRule ?? null);
  }, [workerSelectedId, shiftSelectedId, dateSelected, recurrenceRule]);

  const handleSubmit = async () => {
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
      referenceAssignmentId: null,
    };

    try {
      setIsSubmitting(true);
      if (isEditing && assignment && handleUpdateAssignment) {
        await handleUpdateAssignment(newAssignment);
      } else if (handleCreateAssignment) {
        await handleCreateAssignment(newAssignment);
      }
    } catch (error) {
      console.error("Failed to create assignment:", error);
      alert("Failed to create assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
          slots={{ textField: TextField }}
          slotProps={{
            textField: {
              fullWidth: true,
              error: dateError,
              helperText: dateError ? t("edit-assignment.date-error") : "",
            },
          }}
        />
        {showRecurrenceEdit ? (
          <>
            <hr className="separator" />
            <RecurrenceEdit
              isEditing={true}
              recurrenceType={RecurrenceType.ASSIGNMENT}
              recurrenceRule={recurrenceRuleState || undefined}
              startDate={date || dayjs()}
              teamId={teamId}
              lng={lng}
              onClose={() => {
                setShowRecurrenceEdit(false);
                setRecurrenceRuleState(recurrenceRule ?? null);
              }}
            />
            <hr className="separator" />
          </>
        ) : (
          <button
            className="recurrence-button"
            onClick={() => setShowRecurrenceEdit(!showRecurrenceEdit)}
          >
            {recurrenceRule ? t("edit_recurrence") : t("add_recurrence")}
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
            <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.9rem" }}>
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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="create-button"
          >
            {isSubmitting ? t("creating") : t("create")}
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                if (assignment && handleDeleteAssignment) {
                  handleDeleteAssignment(assignment.id);
                }
              }}
              className="delete-button"
            >
              {t("delete")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="save-button"
            >
              {isSubmitting ? t("saving") : t("save")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default EditAssignment;
