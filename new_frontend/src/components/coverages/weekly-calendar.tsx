import React, { useEffect, useState, useCallback, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// Styles
import "./weekly-calendar.css";
// Types
import { CoverageT } from "../../types/coverage";

dayjs.extend(utc);

export default function WeeklyCalendar({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "week_days");

  const tableRef = useRef<HTMLTableElement>(null);
  const [dayColWidth, setDayColWidth] = useState<number>(80);

  const timeHours: dayjs.Dayjs[] = [];
  let startTime = dayjs.utc().startOf("day");
  const endTime = dayjs.utc(startTime).add(1, "day").startOf("day");
  //   console.log("endTime:", endTime.format("HH:mm"));

  // Loop through 15-minute intervals and generate time slots
  while (startTime.isBefore(endTime)) {
    timeHours.push(startTime);
    startTime = startTime.add(1, "hour");
  }

  const WeekDays = [
    t("monday"),
    t("tuesday"),
    t("wednesday"),
    t("thursday"),
    t("friday"),
    t("saturday"),
    t("sunday"),
  ];

  const rowHeight = "48px";

  useEffect(() => {
    const handleResize = () => {
      if (tableRef.current) {
        const tableWidth = tableRef.current.clientWidth - 49;
        const width = Math.floor(tableWidth / WeekDays.length);
        setDayColWidth(width);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setDayColWidth, WeekDays.length]);

  return (
    <div ref={tableRef}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
        }}
      >
        {/* Times column */}
        <div
          style={{ height: rowHeight, width: "40px", textAlign: "right" }}
        ></div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Days columns */}
          <div style={{ display: "flex", flexDirection: "row" }}>
            <div style={{ width: "8px" }}></div>
            {WeekDays.map((day, index) => (
              <div
                key={`${day}-${index}`}
                style={{
                  minWidth: "68px",
                  width: dayColWidth,
                  textAlign: "center",
                }}
              >
                {day.slice(0, 3)}
              </div>
            ))}
          </div>
          {/* All day row */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
            }}
          >
            <div
              style={{ width: "8px", borderRight: `1px solid #E8E8E8` }}
            ></div>
            {WeekDays.map((day, index) => (
              <div
                key={`${day}-${index}`}
                style={{
                  minWidth: "68px",
                  minHeight: "16px",
                  width: dayColWidth,
                  borderRight: `1px solid #E8E8E8`,
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
      {/* Body */}
      <div style={{ display: "flex", flexDirection: "row" }}>
        {/* Times column */}
        <div>
          {timeHours.map((time, index) => (
            <div
              key={`${time}-${index}`}
              style={{
                height: rowHeight,
                width: "40px",
                textAlign: "right",
                paddingRight: "6px",
              }}
            >
              <span
                style={{
                  position: "relative",
                  top: "-14px",
                  color: "#70757a",
                  fontSize: 10,
                }}
              >
                {time.format("HH:mm")}
              </span>
            </div>
          ))}
        </div>
        {/* Days columns */}
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div aria-hidden="true" className="aLC8Le">
            {timeHours.map((time, index) => (
              <div
                key={`${time}-${index}`}
                className="sJ9Raf"
                style={{ height: rowHeight }}
              ></div>
            ))}
          </div>
          <div style={{ width: "8px", borderRight: `1px solid #E8E8E8` }}></div>
          {WeekDays.map((day, index) => (
            <div
              key={`${day}-${index}`}
              style={{
                minWidth: "68px",
                width: dayColWidth,
                borderRight: `1px solid #E8E8E8`,
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
