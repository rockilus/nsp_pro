import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import { Button, IconButton, MenuItem, Select, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Styles
import "./create-assignment.css";
// Types
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import { AssignmentT } from "../../../types/schedule";

dayjs.extend(utc);

interface CreateAssignmentProps {
  lng: string;
  teamId: string;
  scheduleId: string | null;
  workerSelected: WorkerT | null;
  shiftSelected: ShiftT | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  dateSelected: Dayjs | null;
  onClose: () => void;
  handleCreateAssignment: (newAssignment: AssignmentT) => void;
}

const CreateAssignment: React.FC<CreateAssignmentProps> = ({
  lng,
  teamId,
  scheduleId,
  workerSelected,
  shiftSelected,
  workers,
  shifts,
  dateSelected,
  onClose,
  handleCreateAssignment,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const [worker, setWorker] = useState<WorkerT | null>(workerSelected);
  const [shift, setShift] = useState<ShiftT | null>(shiftSelected);
  const [date, setDate] = useState<Dayjs | null>(dateSelected);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workerError, setWorkerError] = useState(false);
  const [shiftError, setShiftError] = useState(false);
  const [dateError, setDateError] = useState(false);

  useEffect(() => {
    setWorker(workerSelected);
    setWorkerError(false);
    setShiftError(false);
    setDateError(false);
  }, [workerSelected]);

  useEffect(() => {
    setShift(shiftSelected);
    setWorkerError(false);
    setShiftError(false);
    setDateError(false);
  }, [shiftSelected]);

  useEffect(() => {
    setDate(dateSelected);
    setWorkerError(false);
    setShiftError(false);
    setDateError(false);
  }, [dateSelected]);

  const createAssignment = async () => {
    if (!worker) setWorkerError(true);
    if (!shift) setShiftError(true);
    if (!date) setDateError(true);

    if (!worker || !shift || !date) {
      return;
    }

    const newAssignment: AssignmentT = {
      id: "",
      teamId: teamId,
      scheduleId: scheduleId,
      workerId: worker.id,
      date: date,
      shiftId: shift.id,
      fixed: true,
    };

    try {
      setIsSubmitting(true);
      await handleCreateAssignment(newAssignment);
      onClose();
    } catch (error) {
      console.error("Failed to create assignment:", error);
      alert("Failed to create assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-assignment-container">
      <div className="create-assignment-header">
        <span className="create-assignment-title">
          {t("create_assignment")}
        </span>
        <IconButton onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
      <div className="form">
        <span className="form-title">{t("worker")}</span>
        <Select
          className="create-assignment-select"
          value={worker?.id || ""}
          onChange={(e) => {
            setWorkerError(false);
            setWorker(workers.find((w) => w.id === e.target.value) || null);
          }}
          fullWidth
          error={workerError}
          displayEmpty
          renderValue={(selected) => {
            if (selected === "") {
              return (
                <span className="create-assignment-select-placeholder">
                  {t("select_a_worker")}
                </span>
              );
            }
            const selectedWorker = workers.find((w) => w.id === selected);
            return (
              <span className="create-assignment-select-text">
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
          className="create-assignment-datepicker"
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
              helperText: dateError ? t("create-assignment.date-error") : "",
            },
          }}
          sx={{
            marginBottom: "10px",
          }}
        />

        <span className="form-title">{t("shift")}</span>
        <Select
          className="create-assignment-select"
          value={shift?.id || ""}
          onChange={(e) => {
            setShiftError(false);
            setShift(shifts.find((s) => s.id === e.target.value) || null);
          }}
          fullWidth
          error={shiftError}
          displayEmpty
          renderValue={(selected) => {
            if (selected === "") {
              return (
                <span className="create-assignment-select-placeholder">
                  {t("select_a_shift")}
                </span>
              );
            }
            const selectedShift = shifts.find((s) => s.id === selected);
            return (
              <span className="create-assignment-select-text">
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
      <Button
        variant="contained"
        color="primary"
        onClick={createAssignment}
        disabled={isSubmitting}
        className="create-button"
      >
        {isSubmitting ? t("creating") : t("create")}
      </Button>
    </div>
  );
};

export default CreateAssignment;
