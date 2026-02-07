import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import { Button, MenuItem, Select } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Styles
import "../../lhs-tabs/demand-selection.css";
import "../../lhs-tabs/create-demand.css";
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
      >
        –
      </button>
      <button
        className="demand-selection-adjust-button adjust-button-right"
        onClick={onIncrease}
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

  useEffect(() => {
    if (isEditing && cellData) {
      setSelectedShiftId(cellData.shiftDemandsData?.shift?.id ?? null);
      if (cellData.shiftDemandsData?.shiftDemand) {
        setSelectedDate(dayjs.unix(cellData.shiftDemandsData.shiftDemand.date));
      }
    } else if (initialData) {
      setSelectedShiftId(initialData.shiftId);
      setSelectedDate(initialData.date);
    }
  }, [isEditing, cellData, initialData]);

  const handleCreateClick = async () => {
    if (!selectedShiftId || !selectedDate || !onCreateDemand) return;

    setIsSubmitting(true);
    try {
      await onCreateDemand(
        selectedShiftId,
        selectedDate,
        1,
        "Direct requirement",
      );
    } catch (error) {
      console.error("Failed to create demand:", error);
      alert("Failed to create demand. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecreaseDSD = async () => {
    if (!shiftDemand || !onUpdateDemand || shiftDemand.count <= 1) {
      return;
    }

    await onUpdateDemand(shiftDemand.id, {
      count: shiftDemand.count - 1,
    });
  };

  const handleIncreaseDSD = async () => {
    if (!shiftDemand || !onUpdateDemand) return;

    await onUpdateDemand(shiftDemand.id, {
      count: shiftDemand.count + 1,
    });
  };

  const handleDeleteDemands = async () => {
    if (!shiftDemand || !onDeleteDemand) return;

    await onDeleteDemand(shiftDemand.id);
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
            <span className="demand-selection-shift-name">{shift.name}</span>
            <div className="demand-selection-shift-status">
              <span className="dsd-stats dsd-stats-actual">{`${countActual} / ${shiftDemand.count}`}</span>
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
            <span className="demand-selection-dsd-target">
              {shiftDemand.count}
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
                  {staffing.staffing * shiftDemand.count}
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
                ) * shiftDemand.count}
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
          onChange={(e) => setSelectedShiftId(e.target.value)}
          fullWidth
          displayEmpty
        >
          <MenuItem value="" disabled>
            <span style={{ color: "#999" }}>{t("select_a_shift")}</span>
          </MenuItem>
          {shifts.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </Select>

        <span className="form-title">{t("date")}</span>
        <DatePicker
          value={selectedDate}
          onChange={(newDate) =>
            setSelectedDate(newDate ? dayjs(newDate).utc() : null)
          }
          slotProps={{
            textField: {
              fullWidth: true,
            },
          }}
        />
      </div>

      {selectedShift && selectedDate && (
        <div style={{ marginTop: "16px", marginBottom: "16px" }}>
          <span className="demand-selection-shift-name">
            {selectedShift.name}
          </span>
          <span className="demand-selection-date-time">
            {selectedDate.format("D MMMM YYYY")}
            {" ⋅ "}
            {selectedShift.startTime.format("HH:mm")}
            {" - "}
            {selectedShift.endTime.format("HH:mm")}
            {!selectedShift.endTime.isSame(selectedShift.startTime, "day") && (
              <sup>+1</sup>
            )}
          </span>
        </div>
      )}

      <div className="create-demand-actions">
        <Button
          variant="outlined"
          color="error"
          onClick={onCancel}
          className="delete-button"
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
          disabled={isSubmitting || !selectedShiftId || !selectedDate}
          className="create-button"
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
