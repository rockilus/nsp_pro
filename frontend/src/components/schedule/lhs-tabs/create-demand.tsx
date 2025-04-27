import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import { Button, MenuItem, Select, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import RecurrenceEdit from "./recurrence-edit/recurrence-edit";
import RecurrenceDeleteDialog from "./recurrence-delete-dialog";
// Styles
import "./create-demand.css";
// Types
import { ShiftT } from "../../../types/shift";
import { RecurrenceRuleT } from "../../../types/recurrence";
import { DailyShiftDemandT, DSDSourceType } from "@/types/daily-shift-demand";

dayjs.extend(utc);

interface CreateDemandProps {
  lng: string;
  teamId: string;
  scheduleId: string;
  shift: ShiftT;
  dateSelected: Dayjs;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleCancel: () => void;
  recurrence?: RecurrenceRuleT | null;
}

const CreateDemand: React.FC<CreateDemandProps> = ({
  lng,
  teamId,
  scheduleId,
  shift,
  dateSelected,
  handleCreateDSD,
  handleCancel,
  recurrence,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateClick = async () => {
    setIsSubmitting(true);
    const newDsd: DailyShiftDemandT = {
      id: "",
      teamId: teamId,
      scheduleId: scheduleId,
      shiftDemandId: null,
      coverageSelectorId: null,
      sourceType: DSDSourceType.DIRECT_REQUIREMENT,
      date: dateSelected,
      shiftId: shift.id,
      count: 1,
    };
    await handleCreateDSD(newDsd);
    setIsSubmitting(false);
  };

  return (
    <div className="create-demand-container">
      <span className="demand-selection-shift-name">{shift.name}</span>
      <span className="demand-selection-date-time">
        {dateSelected.format("D MMMM YYYY")}
        {" ⋅ "}
        {shift.startTime.format("HH:mm")}
        {" - "}
        {shift.endTime.format("HH:mm")}
        {!shift.endTime.isSame(shift.startTime, "day") && <sup>+1</sup>}
      </span>
      <div className="create-demand-actions">
        <Button
          variant="outlined"
          color="error"
          onClick={handleCancel}
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
          disabled={isSubmitting}
          className="create-button"
          sx={{
            textTransform: "none",
          }}
        >
          {t("create")}
        </Button>
      </div>
    </div>
  );
};

export default CreateDemand;
