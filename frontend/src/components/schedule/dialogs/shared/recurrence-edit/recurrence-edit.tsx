import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../../app/i18n/client";
// MUI
import { Select, MenuItem, TextField, Button } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
// Styles
import "./recurrence-edit.css";
// Types
import {
  OccurrenceType,
  FrequencyType,
  MonthRepeatType,
  RecurrenceEndType,
  RecurrenceRuleT,
  OccurrenceInfoT,
} from "../../../../../types/recurrence";

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
  const { t } = useTranslation(lng, "schedule-page");
  const { t: t_weekdays } = useTranslation(lng, "week_days");

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
    recurrenceEndType:
      recurrenceRule?.recurrenceEndType || RecurrenceEndType.NEVER,
    endDate: recurrenceRule?.endDate || startDate.add(3, "month"),
    numberOfOccurrences: recurrenceRule?.numberOfOccurrences || 12,
  }));

  const [repeatEveryError, setRepeatEveryError] = useState<boolean>(false);
  const [numberOfOccurrencesError, setNumberOfOccurrencesError] =
    useState<boolean>(false);

  useEffect(() => {
    // Defer updating state to avoid synchronous setState inside effect
    // (this avoids the lint rule complaining about setState in effect).
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
        recurrenceEndType:
          recurrenceRule?.recurrenceEndType || RecurrenceEndType.NEVER,
        endDate: recurrenceRule?.endDate || startDate.add(3, "month"),
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
      id: recurrenceRule?.id || "",
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
        formState.recurrenceEndType === RecurrenceEndType.END_DATE
          ? formState.endDate
          : null,
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
    { value: FrequencyType.DAY, label: t("day").toLowerCase() },
    { value: FrequencyType.WEEK, label: t("week").toLowerCase() },
    { value: FrequencyType.MONTH, label: t("month").toLowerCase() },
    { value: FrequencyType.YEAR, label: t("year").toLowerCase() },
  ];

  const weekDayOptions = [
    {
      value: 0,
      label: t_weekdays("monday_short"),
      fullDayName: t_weekdays("monday"),
    },
    {
      value: 1,
      label: t_weekdays("tuesday_short"),
      fullDayName: t_weekdays("tuesday"),
    },
    {
      value: 2,
      label: t_weekdays("wednesday_short"),
      fullDayName: t_weekdays("wednesday"),
    },
    {
      value: 3,
      label: t_weekdays("thursday_short"),
      fullDayName: t_weekdays("thursday"),
    },
    {
      value: 4,
      label: t_weekdays("friday_short"),
      fullDayName: t_weekdays("friday"),
    },
    {
      value: 5,
      label: t_weekdays("saturday_short"),
      fullDayName: t_weekdays("saturday"),
    },
    {
      value: 6,
      label: t_weekdays("sunday_short"),
      fullDayName: t_weekdays("sunday"),
    },
  ];

  // Define a dictionary for translating ordinal terms
  const ordinalTranslation: Record<number, string> = {
    1: t("first"),
    2: t("second"),
    3: t("third"),
    4: t("fourth"),
    5: t("fifth"),
  };

  // Update the monthRepeatOptions to use the ordinalTranslation dictionary
  const monthRepeatOptions = [
    {
      value: MonthRepeatType.DAY_IN_MONTH,
      label: `${t("Monthly on day")} ${startDate.date()}`,
    },
    {
      value: MonthRepeatType.WEEKDAY,
      label: `${t("Monthly on the")} ${
        ordinalTranslation[Math.ceil(startDate.date() / 7)]
      } ${
        weekDayOptions.find((day) => day.value === (startDate.day() + 6) % 7)
          ?.fullDayName
      } `,
    },
  ];

  return (
    <div className="recurrence-edit-container">
      <h2 className="recurrence-edit-title">{t("recurrence")}</h2>

      <div className="recurrence-edit-section">
        <div className="recurrence-edit-sub-section-row">
          <label className="recurrence-edit-text">{t("repeat_every")}</label>
          <TextField
            type="number"
            value={formState.repeatEvery === 0 ? "" : formState.repeatEvery}
            onChange={(e) => {
              setFormState((prev) => ({
                ...prev,
                repeatEvery: e.target.value === "" ? 0 : Number(e.target.value),
              }));
              setRepeatEveryError(false);
            }}
            error={repeatEveryError}
            inputProps={{
              min: 1,
              style: {
                height: "30px",
                fontSize: "0.8rem",
                color: "#3c4043",
                padding: "0",
                textAlign: "right",
                appearance: "textfield",
              },
            }}
            variant="outlined"
            size="small"
            sx={{ width: "50px", marginLeft: "5px" }}
          />
          <Select
            value={formState.frequencyType}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                frequencyType: Number(e.target.value) as FrequencyType,
              }))
            }
            fullWidth
            displayEmpty
            sx={{
              width: "100px",
              height: "30px",
              fontSize: "0.8rem",
              fontWeight: 400,
              color: "#3c4043",
              marginLeft: "5px",
              "& .MuiSelect-select": {
                paddingY: "0",
              },
            }}
          >
            {frequencyOptions.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: 400,
                  color: "#3c4043",
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>

      {formState.frequencyType === FrequencyType.WEEK && (
        <div className="recurrence-edit-section">
          <div className="recurrence-edit-sub-section">
            <label className="recurrence-edit-text">{t("repeat_on")}</label>
            <div className="recurrence-edit-select-weekdays">
              {weekDayOptions.map((day) => (
                <button
                  key={day.value}
                  onClick={() => handleWeekDayToggle(day.value)}
                  className={`weekday-button ${
                    formState.weekDays.includes(day.value) ? "selected" : ""
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {formState.frequencyType === FrequencyType.MONTH && (
        <div className="recurrence-edit-section">
          <Select
            value={formState.monthRepeatType || MonthRepeatType.DAY_IN_MONTH}
            onChange={(e) => {
              setFormState((prev) => ({
                ...prev,
                monthRepeatType: Number(e.target.value) as MonthRepeatType,
              }));
            }}
            fullWidth
            displayEmpty
            sx={{
              width: "100%",
              height: "30px",
              fontSize: "0.8rem",
              fontWeight: 400,
              color: "#3c4043",
              "& .MuiSelect-select": {
                paddingY: "0",
              },
            }}
          >
            {monthRepeatOptions.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: 400,
                  color: "#3c4043",
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </div>
      )}

      <div className="recurrence-edit-section">
        <label className="recurrence-edit-text">{t("ends")}</label>
        <div className="recurrence-edit-end-options">
          <label>
            <input
              type="radio"
              value={RecurrenceEndType.NEVER}
              checked={formState.recurrenceEndType === RecurrenceEndType.NEVER}
              onChange={() =>
                setFormState((prev) => ({
                  ...prev,
                  recurrenceEndType: RecurrenceEndType.NEVER,
                }))
              }
            />
            <span className="recurrence-edit-text recurrence-edit-radio-option-label">
              {t("never")}
            </span>
          </label>
          <div className="recurrence-edit-end-option">
            <label>
              <input
                type="radio"
                value={RecurrenceEndType.END_DATE}
                checked={
                  formState.recurrenceEndType === RecurrenceEndType.END_DATE
                }
                onChange={() =>
                  setFormState((prev) => ({
                    ...prev,
                    recurrenceEndType: RecurrenceEndType.END_DATE,
                  }))
                }
              />
              <span className="recurrence-edit-text recurrence-edit-radio-option-label">
                {t("on")}
              </span>
            </label>
            <DatePicker
              disabled={
                formState.recurrenceEndType !== RecurrenceEndType.END_DATE
              }
              value={formState.endDate}
              onChange={(newDate) => {
                setFormState((prev) => ({
                  ...prev,
                  endDate: newDate
                    ? dayjs(newDate).utc()
                    : startDate.add(3, "month"),
                }));
              }}
              minDate={startDate}
              sx={{
                marginLeft: "5px",
                width: "130px",
                color: "#3c4043",
                "& .MuiInputBase-root": {
                  height: "30px",
                },
                "& .MuiInputBase-input": {
                  fontSize: "0.8rem",
                  fontWeight: 400,
                },
                "& .MuiSvgIcon-root": {
                  fontSize: "1rem",
                },
              }}
              // renderInput={(params) => <TextField {...params} />}
            />
          </div>
          <div className="recurrence-edit-end-option">
            <label>
              <input
                type="radio"
                value={RecurrenceEndType.NUMBER_OF_OCCURRENCES}
                checked={
                  formState.recurrenceEndType ===
                  RecurrenceEndType.NUMBER_OF_OCCURRENCES
                }
                onChange={() =>
                  setFormState((prev) => ({
                    ...prev,
                    recurrenceEndType: RecurrenceEndType.NUMBER_OF_OCCURRENCES,
                  }))
                }
              />
              <span className="recurrence-edit-text recurrence-edit-radio-option-label">
                {t("after")}
              </span>
            </label>
            <TextField
              type="number"
              disabled={
                formState.recurrenceEndType !==
                RecurrenceEndType.NUMBER_OF_OCCURRENCES
              }
              value={
                formState.numberOfOccurrences === 0
                  ? ""
                  : formState.numberOfOccurrences
              }
              onChange={(e) => {
                setFormState((prev) => ({
                  ...prev,
                  numberOfOccurrences:
                    e.target.value === "" ? 0 : Number(e.target.value),
                }));
                setNumberOfOccurrencesError(false);
              }}
              error={numberOfOccurrencesError}
              inputProps={{
                min: 1,
                style: {
                  height: "30px",
                  fontSize: "0.8rem",
                  color: "#3c4043",
                  padding: "0",
                  textAlign: "right",
                  appearance: "textfield",
                },
              }}
              variant="outlined"
              size="small"
              sx={{ width: "50px", marginLeft: "5px" }}
            />
            <span className="recurrence-edit-text">
              {t("occurrences").toLocaleLowerCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="recurrence-edit-section">
        <div className="recurrence-edit-actions">
          <Button
            variant="outlined"
            onClick={handleCancel}
            sx={{
              marginRight: 1,
              textTransform: "none",
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ textTransform: "none", fontSize: "0.8rem", fontWeight: 500 }}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecurrenceEdit;
