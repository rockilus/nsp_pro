import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import { Select, MenuItem, TextField, Button } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
// Styles
import "./recurrence-edit.css";
// Types
import {
  RecurrenceType,
  FrequencyType,
  MonthRepeatType,
  RecurrenceEndType,
  RecurrenceRuleT,
} from "../../../../types/recurrence";

dayjs.extend(utc);

interface RecurrenceEditProps {
  lng: string;
  isEditing: boolean;
  recurrenceType: RecurrenceType;
  recurrenceRule?: RecurrenceRuleT;
  startDate: dayjs.Dayjs;
  teamId: string;
}

const RecurrenceEdit: React.FC<RecurrenceEditProps> = ({
  lng,
  isEditing,
  recurrenceType,
  recurrenceRule,
  startDate,
  teamId,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const [repeatEvery, setRepeatEvery] = useState<number>(
    recurrenceRule?.repeatEvery || 1
  );
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(
    recurrenceRule?.frequencyType || FrequencyType.WEEK
  );
  const [weekDays, setWeekDays] = useState<number[]>(
    recurrenceRule?.weekDays || [startDate.day()]
  );
  const [monthRepeatType, setMonthRepeatType] =
    useState<MonthRepeatType | null>(recurrenceRule?.monthRepeatType || null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>(
    recurrenceRule?.recurrenceEndType || RecurrenceEndType.NEVER
  );
  const [endDate, setEndDate] = useState<dayjs.Dayjs>(
    recurrenceRule?.endDate || startDate.add(3, "month")
  );
  const [numberOfOccurrences, setNumberOfOccurrences] = useState<number>(
    recurrenceRule?.numberOfOccurrences || 12
  );

  const handleWeekDayToggle = (day: number) => {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    console.log("Recurrence saved:", {
      repeatEvery,
      frequencyType,
      weekDays,
      monthRepeatType,
      recurrenceEndType,
      endDate,
      numberOfOccurrences,
    });
  };

  const handleCancel = () => {
    console.log("Recurrence editing cancelled");
  };

  const frequencyOptions = [
    { value: FrequencyType.DAY, label: t("day").toLowerCase() },
    { value: FrequencyType.WEEK, label: t("week").toLowerCase() },
    { value: FrequencyType.MONTH, label: t("month").toLowerCase() },
    { value: FrequencyType.YEAR, label: t("year").toLowerCase() },
  ];

  const weekDayOptions = [
    { value: 0, label: t("M"), fullDayName: t("Monday") },
    { value: 1, label: t("T"), fullDayName: t("Tuesday") },
    { value: 2, label: t("W"), fullDayName: t("Wednesday") },
    { value: 3, label: t("T"), fullDayName: t("Thursday") },
    { value: 4, label: t("F"), fullDayName: t("Friday") },
    { value: 5, label: t("S"), fullDayName: t("Saturday") },
    { value: 6, label: t("S"), fullDayName: t("Sunday") },
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
        weekDayOptions.find((day) => day.value === startDate.day())?.fullDayName
      } `,
    },
  ];

  console.log("monthRepeatType", monthRepeatType);

  return (
    <div className="recurrence-edit-container">
      <h2 className="recurrence-edit-title">{t("recurrence")}</h2>

      <div className="recurrence-edit-section">
        <div className="recurrence-edit-sub-section-row">
          <label className="recurrence-edit-text">{t("repeat_every")}</label>
          <TextField
            type="number"
            value={repeatEvery === 0 ? "" : repeatEvery}
            onChange={(e) =>
              setRepeatEvery(e.target.value === "" ? 0 : Number(e.target.value))
            }
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
            value={frequencyType}
            onChange={(e) =>
              setFrequencyType(Number(e.target.value) as FrequencyType)
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

      {frequencyType === FrequencyType.WEEK && (
        <div className="recurrence-edit-section">
          <div className="recurrence-edit-sub-section">
            <label className="recurrence-edit-text">{t("repeat_on")}</label>
            <div className="recurrence-edit-select-weekdays">
              {weekDayOptions.map((day) => (
                <button
                  key={day.value}
                  onClick={() => handleWeekDayToggle(day.value)}
                  className={`weekday-button ${
                    weekDays.includes(day.value) ? "selected" : ""
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {frequencyType === FrequencyType.MONTH && (
        <div className="recurrence-edit-section">
          <Select
            value={monthRepeatType || MonthRepeatType.DAY_IN_MONTH}
            onChange={(e) => {
              setMonthRepeatType(Number(e.target.value) as MonthRepeatType);
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
              checked={recurrenceEndType === RecurrenceEndType.NEVER}
              onChange={() => setRecurrenceEndType(RecurrenceEndType.NEVER)}
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
                checked={recurrenceEndType === RecurrenceEndType.END_DATE}
                onChange={() =>
                  setRecurrenceEndType(RecurrenceEndType.END_DATE)
                }
              />
              <span className="recurrence-edit-text recurrence-edit-radio-option-label">
                {t("on")}
              </span>
            </label>
            <DatePicker
              disabled={recurrenceEndType !== RecurrenceEndType.END_DATE}
              value={endDate}
              onChange={(newDate) => {
                setEndDate(
                  newDate ? dayjs(newDate).utc() : startDate.add(3, "month")
                );
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
                  recurrenceEndType === RecurrenceEndType.NUMBER_OF_OCCURRENCES
                }
                onChange={() =>
                  setRecurrenceEndType(RecurrenceEndType.NUMBER_OF_OCCURRENCES)
                }
              />
              <span className="recurrence-edit-text recurrence-edit-radio-option-label">
                {t("after")}
              </span>
            </label>

            {/* <TextField
            type="number"
            value={repeatEvery === 0 ? "" : repeatEvery}
            onChange={(e) =>
              setRepeatEvery(e.target.value === "" ? 0 : Number(e.target.value))
            }
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
          /> */}

            <TextField
              type="number"
              disabled={
                recurrenceEndType !== RecurrenceEndType.NUMBER_OF_OCCURRENCES
              }
              value={numberOfOccurrences === 0 ? "" : numberOfOccurrences}
              onChange={(e) =>
                setNumberOfOccurrences(
                  e.target.value === "" ? 0 : Number(e.target.value)
                )
              }
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
