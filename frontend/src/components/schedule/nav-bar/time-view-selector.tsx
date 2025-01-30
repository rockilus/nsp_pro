import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

dayjs.extend(utc);

export default function TimeViewSelector({
  lng,
  currentPeriodStart,
  currentPeriodEnd,
  selectedTimeView,
  handleToday,
  handlePreviousPeriod,
  handleNextPeriod,
  handleChangeSelectedTimeView,
}: {
  lng: string;
  currentPeriodStart: dayjs.Dayjs;
  currentPeriodEnd: dayjs.Dayjs;
  selectedTimeView: string;
  handleToday: () => void;
  handlePreviousPeriod: () => void;
  handleNextPeriod: () => void;
  handleChangeSelectedTimeView: (newSelectedTimeView: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [isHoveredToday, setIsHoveredToday] = useState<boolean>(false);
  const [isHoveredPrevious, setIsHoveredPrevious] = useState<boolean>(false);
  const [isHoveredNext, setIsHoveredNext] = useState<boolean>(false);
  const [isHoveredTimeSelect, setIsHoveredTimeSelect] =
    useState<boolean>(false);

  function getPeriodLabel(start: dayjs.Dayjs, end: dayjs.Dayjs): string {
    if (start.isSame(end, "month") && start.isSame(end, "year")) {
      return start.format("MMMM YYYY");
    } else if (!start.isSame(end, "month") && start.isSame(end, "year")) {
      return start.format("MMM") + " - " + end.format("MMM YYYY");
    } else {
      return start.format("MMM YYYY") + " - " + end.format("MMM YYYY");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", width: "430px" }}>
      <button
        onClick={handleToday}
        style={{
          borderRadius: "4px",
          border: "1px solid #e5e7eb",
          height: "35px",
          padding: "0 15px",
          fontSize: "0.9rem",
          fontWeight: 550,
          color: "#616161",
          backgroundColor: isHoveredToday ? "#f0f0f0" : "white",
        }}
        onMouseEnter={() => setIsHoveredToday(true)}
        onMouseLeave={() => setIsHoveredToday(false)}
      >
        {t("today")}
      </button>
      <button
        onClick={handlePreviousPeriod}
        style={{
          borderRadius: "50%",
          height: "30px",
          width: "30px",
          color: "#616161",
          backgroundColor: isHoveredPrevious ? "#f0f0f0" : "white",
          marginLeft: "5px",
        }}
        onMouseEnter={() => setIsHoveredPrevious(true)}
        onMouseLeave={() => setIsHoveredPrevious(false)}
      >
        <NavigateBeforeIcon />
      </button>
      <button
        onClick={handleNextPeriod}
        style={{
          borderRadius: "50%",
          height: "30px",
          width: "30px",
          color: "#616161",
          backgroundColor: isHoveredNext ? "#f0f0f0" : "white",
        }}
        onMouseEnter={() => setIsHoveredNext(true)}
        onMouseLeave={() => setIsHoveredNext(false)}
      >
        <NavigateNextIcon />
      </button>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          marginLeft: "5px",
          height: "35px",
          width: "180px",
          fontSize: "1.2rem",
          fontWeight: 550,
          color: "#616161",
        }}
      >
        {getPeriodLabel(currentPeriodStart, currentPeriodEnd)}
      </span>
      <select
        value={selectedTimeView}
        onChange={(e) => handleChangeSelectedTimeView(e.target.value)}
        style={{
          borderRadius: "4px",
          border: "1px solid #e5e7eb",
          height: "35px",
          width: "80px",
          padding: "0 0 0 5px",
          fontSize: "0.9rem",
          fontWeight: 550,
          color: "#616161",
          backgroundColor: isHoveredTimeSelect ? "#f0f0f0" : "white",
          marginLeft: "8px",
        }}
        onMouseEnter={() => setIsHoveredTimeSelect(true)}
        onMouseLeave={() => setIsHoveredTimeSelect(false)}
      >
        <option value="week">{t("week")}</option>
        <option value="month">{t("month")}</option>
      </select>
    </div>
  );
}
