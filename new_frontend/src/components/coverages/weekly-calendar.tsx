import React, { useEffect, useState, useCallback, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// Components
import eventToDiv from "./event-to-div";
// Methods
import shiftDemandsToEvents from "./sds-to-events";
// Styles
import "./weekly-calendar.css";
// Types
import { CoverageT, EventT } from "../../types/coverage";

dayjs.extend(utc);

export default function WeeklyCalendar({
  lng,
  coverage,
}: {
  lng: string;
  coverage: CoverageT | null;
}) {
  const { t } = useTranslation(lng, "week_days");

  const tableRef = useRef<HTMLTableElement>(null);
  const [dayColWidth, setDayColWidth] = useState<number>(80);
  const [events, setEvents] = useState<EventT[]>([]);

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

  // const rowHeight = "48px";
  const rowHeight = 48;

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

  useEffect(() => {
    if (coverage) {
      const events = shiftDemandsToEvents(coverage.shiftDemands);
      setEvents(events);
    }
  }, [coverage]);

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
          {WeekDays.map((day, index) => {
            const dayEvents = events.filter(
              (event) => event.shiftDemand.dayIndex === index
            );
            return (
              <div
                key={`${day}-${index}`}
                style={{
                  minWidth: "68px",
                  width: dayColWidth,
                  borderRight: `1px solid #E8E8E8`,
                  position: "relative",
                }}
              >
                {dayEvents.map((event, index) => {
                  return eventToDiv(event, rowHeight, dayColWidth);
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

{
  /* Events */
}
{
  /* {index === 0 && (
                <div
                  style={{
                    top: "30px",
                    left: "0",
                    // width: "100%",
                    width: dayColWidth - 1,
                    height: "30px",
                    backgroundColor: "rgba(0, 0, 255, 0.7)",
                    color: "white",
                    borderRadius: "4px",
                    position: "absolute",
                    zIndex: 5,
                  }}
                >
                  Test
                </div>
              )}
              {index === 0 && (
                <div
                  style={{
                    top: "70px",
                    left: "0",
                    width: (dayColWidth - 1) / 2 - 0.5,
                    height: "30px",
                    backgroundColor: "rgba(0, 0, 255, 0.7)",
                    color: "white",
                    borderRadius: "4px",
                    position: "absolute",
                    zIndex: 5,
                  }}
                >
                  Test
                </div>
              )}
              {index === 0 && (
                <div
                  style={{
                    top: "70px",
                    left: (dayColWidth - 1) / 2 + 0.5,
                    width: (dayColWidth - 1) / 2 - 0.5,
                    height: "30px",
                    marginRight: "1px",
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    borderRadius: "4px",
                    position: "absolute",
                    zIndex: 5,
                  }}
                >
                  Test
                </div>
              )}
              {index === 0 && (
                <div
                  style={{
                    top: rowHeight * 22,
                    left: 0,
                    width: dayColWidth - 1,
                    height: rowHeight * 2,
                    marginRight: "1px",
                    backgroundColor: "rgba(255, 0, 0, 0.7)",
                    color: "white",
                    borderTopLeftRadius: "4px",
                    borderTopRightRadius: "4px",
                    position: "absolute",
                    zIndex: 5,
                  }}
                >
                  Test
                </div>
              )}
              {index === 1 && (
                <div
                  style={{
                    top: 0,
                    left: 0,
                    width: dayColWidth - 1,
                    height: rowHeight * 2,
                    marginRight: "1px",
                    backgroundColor: "rgba(255, 0, 0)",
                    opacity: 0.7,
                    color: "white",
                    borderTopLeftRadius: "0px",
                    borderTopRightRadius: "0px",
                    borderBottomLeftRadius: "4px",
                    borderBottomRightRadius: "4px",
                    position: "absolute",
                    zIndex: 5,
                  }}
                >
                  Test
                </div>
              )} */
}
