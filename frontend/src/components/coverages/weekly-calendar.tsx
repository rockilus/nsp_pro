import React, { useEffect, useState, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
import EventToDiv from "./event-to-div";
import ShiftDemandButton from "./shift-demand-button";
// Methods
import shiftDemandsToEvents from "./sds-to-events";
// Styles
import "./weekly-calendar.css";
// Types
import { CoverageT, EventT, ShiftDemandT } from "../../types/coverage";
import {
  ShiftT,
  ShiftLeaveType,
  ShiftType,
  ShiftRestType,
} from "../../types/shift";

dayjs.extend(utc);

export default function WeeklyCalendar({
  lng,
  coverage,
  shifts,
  handleAddShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: {
  lng: string;
  coverage: CoverageT | null;
  shifts: ShiftT[];
  handleAddShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleUpdateShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleDeleteShiftDemand: (coverageId: string, shiftDemandId: string) => void;
}) {
  const { t: t_week_days } = useTranslation(lng, "week_days");
  const { t } = useTranslation(lng, "coverage-page");

  const tableRef = useRef<HTMLTableElement>(null);
  const [dayColWidth, setDayColWidth] = useState<number>(80);
  const [events, setEvents] = useState<EventT[]>([]);

  const emptyShift = {
    teamId: "",
    id: "",
    name: "",
    startTime: dayjs(),
    endTime: dayjs(),
    staffing: 0,
    color: "",
    shiftType: ShiftType.NORMAL,
    restType: ShiftRestType.NONE,
    leaveType: ShiftLeaveType.NONE,
    recuperationTime: 0,
    recuperationDutyId: null,
    deleted: false,
    attributes: [],
  };

  const timeHours: dayjs.Dayjs[] = [];
  let startTime = dayjs.utc().startOf("day");
  const endTime = dayjs.utc(startTime).add(1, "day").startOf("day");

  // Loop through 15-minute intervals and generate time slots
  while (startTime.isBefore(endTime)) {
    timeHours.push(startTime);
    startTime = startTime.add(1, "hour");
  }

  const WeekDays = [
    t_week_days("monday"),
    t_week_days("tuesday"),
    t_week_days("wednesday"),
    t_week_days("thursday"),
    t_week_days("friday"),
    t_week_days("saturday"),
    t_week_days("sunday"),
  ];

  const rowHeight = 48;

  const addShiftDemandButton = () => {
    return (
      <Button
        sx={{
          cursor: "pointer",
          backgroundColor: "transparent",
          border: "none",
          // transition: "background-color 0.3s ease",
          width: "100%",
          height: "100%",
          textTransform: "none",
          paddingY: "0px",
          fontSize: "0.8rem",
          fontWeight: "bold",
          // color: "blue.900",
          color: "primary",
        }}
        onMouseOver={(e) => {
          (e.target as HTMLElement).style.backgroundColor = "lightgrey";
        }}
        onMouseOut={(e) => {
          (e.target as HTMLElement).style.backgroundColor = "transparent";
        }}
      >
        {t("add_shift")}
      </Button>
    );
  };

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
    <div className="weekly-calendar-container" ref={tableRef}>
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
                  color: "#70757a",
                  fontWeight: "500",
                }}
              >
                <span className="day-header">{day.slice(0, 3)}</span>
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
                  // display: "flex",
                  // flexDirection: "row",
                  // justifyContent: "center",
                  minWidth: "68px",
                  minHeight: "16px",
                  width: dayColWidth,
                  borderRight: `1px solid #E8E8E8`,
                }}
              >
                {coverage && (
                  <ShiftDemandButton
                    lng={lng}
                    buttonElement={addShiftDemandButton()}
                    shiftDemand={{
                      id: "",
                      dayIndex: index,
                      shift: emptyShift,
                      coverageId: coverage.id,
                    }}
                    shifts={shifts}
                    handleAddShiftDemand={handleAddShiftDemand}
                    handleUpdateShiftDemand={handleUpdateShiftDemand}
                    handleDeleteShiftDemand={handleDeleteShiftDemand}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Body */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          overflow: "auto",
          height: "calc(100vh - 130px)",
        }}
      >
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
                {time.isSame(time.startOf("day")) ? null : time.format("HH:mm")}
              </span>
            </div>
          ))}
        </div>
        {/* Days columns */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            position: "relative",
            height: rowHeight * 24,
          }}
        >
          <div aria-hidden="true" className="aLC8Le">
            {timeHours.map((time, index) => (
              <div
                key={`${time}-${index}`}
                className="time-divider"
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
                  return (
                    <EventToDiv
                      key={`${event.shiftDemand.id}-${index}`}
                      lng={lng}
                      event={event}
                      rowHeight={rowHeight}
                      columnWidth={dayColWidth}
                      staffingLabel={t("staffing")}
                      shifts={shifts}
                      handleAddShiftDemand={handleAddShiftDemand}
                      handleUpdateShiftDemand={handleUpdateShiftDemand}
                      handleDeleteShiftDemand={handleDeleteShiftDemand}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
