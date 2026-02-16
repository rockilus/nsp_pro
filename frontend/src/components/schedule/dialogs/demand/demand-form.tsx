import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import { Button, MenuItem, Select } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Styles
import "./demand-selection.css";
import "./create-demand.css";
// Types
import { ShiftT } from "../../../../types/shift";
import { SpecialtyT } from "@/types/specialty";
import { ShiftDemandDTO, ShiftDemandUpdateDTO } from "@/types/shiftDemand";
import { AssignmentT } from "@/types/assignment";
import { ScheduleCellDataT } from "../../../../types/schedule";
import { DialogMode } from "../schedule-item-types";

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
  onUpdateDemand?: (
    demandId: string,
    updates: Partial<ShiftDemandUpdateDTO>,
  ) => Promise<void>;
  onDeleteDemand?: (demandId: string) => Promise<void>;
  onCancel: () => void;
}

interface AdjustStaffingButtonsProps {
  onDecrease: () => void;
  onIncrease: () => void;
}

const AdjustStaffingButtons = ({
  onDecrease,
  onIncrease,
}: AdjustStaffingButtonsProps) => {
  return (
    <div className="demand-selection-adjust-buttons-container">
      <button
        className="demand-selection-adjust-button adjust-button-left"
        onClick={onDecrease}
        data-testid="decrease-demand-button"
      >
        –
      </button>
      <button
        className="demand-selection-adjust-button adjust-button-right"
        onClick={onIncrease}
        data-testid="increase-demand-button"
      >
        +
      </button>
    </div>
  );
};

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
  const { t } = useTranslation(lng, "schedule-page");

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

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(
    shift?.id ?? null,
  );
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(date);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demandCount, setDemandCount] = useState<number>(
    shiftDemand?.count ?? 1,
  );
  const [shiftError, setShiftError] = useState<string>("");
  const [dateError, setDateError] = useState<string>("");

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
    // Clear previous errors
    setShiftError("");
    setDateError("");

    // Validate inputs
    let hasError = false;

    if (!selectedShiftId) {
      setShiftError(t("please_select_a_shift"));
      hasError = true;
    }

    if (!selectedDate) {
      setDateError(t("please_select_a_date"));
      hasError = true;
    }

    if (hasError || !onCreateDemand) return;

    setIsSubmitting(true);
    try {
      await onCreateDemand(
        selectedShiftId!,
        selectedDate!,
        1,
        "Direct requirement",
      );
      onCancel(); // Close dialog after successful creation
    } catch (error) {
      console.error("Failed to create demand:", error);
      alert("Failed to create demand. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecreaseDSD = async () => {
    if (!shiftDemand || !onUpdateDemand || demandCount <= 1) {
      return;
    }

    const newCount = demandCount - 1;
    const previousCount = demandCount;
    setDemandCount(newCount); // Optimistic update

    try {
      await onUpdateDemand(shiftDemand.id, {
        count: newCount,
      });
    } catch (error) {
      // Revert on error
      setDemandCount(previousCount);
      console.error("Failed to decrease demand:", error);
    }
  };

  const handleIncreaseDSD = async () => {
    if (!shiftDemand || !onUpdateDemand) return;

    const newCount = demandCount + 1;
    const previousCount = demandCount;
    setDemandCount(newCount); // Optimistic update

    try {
      await onUpdateDemand(shiftDemand.id, {
        count: newCount,
      });
    } catch (error) {
      // Revert on error
      setDemandCount(previousCount);
      console.error("Failed to increase demand:", error);
    }
  };

  const handleDeleteDemands = async () => {
    if (!shiftDemand || !onDeleteDemand) return;

    await onDeleteDemand(shiftDemand.id);
    onCancel(); // Close dialog after successful deletion
  };

  if (isEditing && shift && shiftDemand && selectedDate) {
    // Edit mode - show demand details with adjustment buttons
    const assignmentsCount = assignments.length;
    const shiftStaffingTotal = shift.staffing.reduce(
      (sum: number, staffing) => sum + staffing.staffing,
      0,
    );

    const countActual =
      shiftStaffingTotal > 0
        ? Math.floor(assignmentsCount / shiftStaffingTotal)
        : 0;

    return (
      <div className="demand-selection-container">
        <div className="demand-selection-content">
          <div className="demand-selection-first-row">
            <span
              className="demand-selection-shift-name"
              data-testid="demand-shift-name"
            >
              {shift.name}
            </span>
            <div className="demand-selection-shift-status">
              <span
                className="dsd-stats dsd-stats-actual"
                data-testid="demand-count-display"
              >{`${countActual} / ${demandCount}`}</span>
            </div>
          </div>
          <span className="demand-selection-date-time">
            {selectedDate.format("D MMMM YYYY")}
            {" ⋅ "}
            {shift.startTime.format("HH:mm")}
            {" - "}
            {shift.endTime.format("HH:mm")}
            {!shift.endTime.isSame(shift.startTime, "day") && <sup>+1</sup>}
          </span>
          <div className="demand-selection-daily-shift-demand">
            <span className="demand-selection-dsd-label">{t("demand")}</span>
            <span
              className="demand-selection-dsd-target"
              data-testid="demand-target-count"
            >
              {demandCount}
            </span>
            <AdjustStaffingButtons
              onDecrease={handleDecreaseDSD}
              onIncrease={handleIncreaseDSD}
            />
          </div>
          <div className="demand-selection-staffing-required">
            <span className="demand-selection-staffing-required-label">
              {t("staffing_required")}
            </span>
            {shift.staffing.map((staffing, index) => (
              <div
                key={`${staffing.specialtyId}-${index}`}
                className="demand-selection-staffing-required-item"
              >
                <span className="demand-selection-staffing-required-name">
                  {staffing.specialtyId
                    ? specialties.find((s) => s.id == staffing.specialtyId)
                        ?.name
                    : t("any")}
                </span>
                <span className="demand-selection-staffing-required-count-per-shift">
                  {`(${staffing.staffing})`}
                </span>
                <span className="demand-selection-staffing-required-count">
                  {staffing.staffing * demandCount}
                </span>
              </div>
            ))}
            <div className="demand-selection-sum-line" />
            <div className="demand-selection-staffing-required-item">
              <span className="demand-selection-staffing-required-name">
                {t("total")}
              </span>
              <span className="demand-selection-staffing-required-count-per-shift"></span>
              <span className="demand-selection-staffing-required-count">
                {shift.staffing.reduce(
                  (sum: number, staffing) => sum + staffing.staffing,
                  0,
                ) * demandCount}
              </span>
            </div>
          </div>
        </div>
        <div className="demand-selection-buttons-container">
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteDemands}
            className="delete-button"
            data-testid="delete-demand-button"
            sx={{
              textTransform: "none",
            }}
          >
            {t("delete")}
          </Button>
        </div>
      </div>
    );
  }

  // Create mode - show shift and date selectors
  const selectedShift = shifts.find((s) => s.id === selectedShiftId);

  return (
    <div className="create-demand-container">
      <div className="form">
        <span className="form-title">{t("shift")}</span>
        <Select
          value={selectedShiftId || ""}
          onChange={(e) => {
            setSelectedShiftId(e.target.value);
            setShiftError(""); // Clear error on change
          }}
          fullWidth
          displayEmpty
          data-testid="demand-shift-select"
          error={!!shiftError}
        >
          <MenuItem value="" disabled>
            <span style={{ color: "#999" }}>{t("select_a_shift")}</span>
          </MenuItem>
          {shifts.map((s) => (
            <MenuItem
              key={s.id}
              value={s.id}
              data-testid={`demand-shift-option-${s.id}`}
            >
              {s.name}
            </MenuItem>
          ))}
          )
        </Select>
        {shiftError && (
          <span
            style={{
              color: "#d32f2f",
              fontSize: "0.75rem",
              marginTop: "4px",
              display: "block",
            }}
            data-testid="demand-shift-error"
          >
            {shiftError}
          </span>
        )}

        <span className="form-title">{t("date")}</span>
        <DatePicker
          value={selectedDate}
          timezone="UTC"
          onChange={(newDate) => {
            setSelectedDate(newDate ? dayjs(newDate).utc() : null);
            setDateError(""); // Clear error on change
          }}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!dateError,
              inputProps: {
                "data-testid": "demand-date-picker",
              },
            },
          }}
        />
        {dateError && (
          <span
            style={{
              color: "#d32f2f",
              fontSize: "0.75rem",
              marginTop: "4px",
              display: "block",
            }}
            data-testid="demand-date-error"
          >
            {dateError}
          </span>
        )}
      </div>

      <div className="create-demand-actions">
        <Button
          variant="outlined"
          color="error"
          onClick={onCancel}
          className="delete-button"
          data-testid="cancel-demand-button"
          sx={{
            textTransform: "none",
            marginRight: "8px",
          }}
        >
          {t("cancel")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateClick}
          disabled={isSubmitting}
          className="create-button"
          data-testid="create-demand-button"
          sx={{
            textTransform: "none",
          }}
        >
          {isSubmitting ? t("creating") : t("create")}
        </Button>
      </div>
    </div>
  );
};

export default DemandForm;
