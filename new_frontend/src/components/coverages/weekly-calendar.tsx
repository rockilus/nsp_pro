import React, { useEffect, useState, useCallback, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Styles
import "./weekly-calendar.css";

dayjs.extend(utc);

export default function WeeklyCalendar({}: {}) {
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
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  // const WeekDays = [
  //   t("monday"),
  //   t("tuesday"),
  //   t("wednesday"),
  //   t("thursday"),
  //   t("friday"),
  //   t("saturday"),
  //   t("sunday"),
  // ];

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

  console.log("clientWidth:", tableRef.current?.clientWidth);

  console.log("dayColWidth:", dayColWidth);

  return (
    <div ref={tableRef}>
      <div>Header</div>
      {/* Calendar */}
      <div style={{ display: "flex", flexDirection: "row" }}>
        {/* Times column */}
        <div>
          {timeHours.map((time, index) => (
            <div
              key={`${time}-${index}`}
              style={{ height: rowHeight, width: "40px", textAlign: "right" }}
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
