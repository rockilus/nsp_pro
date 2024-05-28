import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "react-i18next";
// MUI
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from "@mui/material";
// Constants
import {
  CovTimeColWidth,
  CovTimeColPadR,
  CovHeadRowHeight,
  CovBodyRowHeight,
  CovBorderThick,
} from "../../utils/constants";

dayjs.extend(utc);

type Props = {
  dayColWidth: number;
};

export default function WeekViewTable({ dayColWidth }: Props) {
  const { t } = useTranslation();

  const WeekDays = [
    t("week_days.monday"),
    t("week_days.tuesday"),
    t("week_days.wednesday"),
    t("week_days.thursday"),
    t("week_days.friday"),
    t("week_days.saturday"),
    t("week_days.sunday"),
  ];

  // Generate time slots with 15-minute intervals
  const timeSlots: dayjs.Dayjs[] = [];
  let startTime = dayjs.utc().startOf("day");
  const endTime = dayjs.utc(startTime).add(1, "day").startOf("day");
  //   console.log("endTime:", endTime.format("HH:mm"));

  // Loop through 15-minute intervals and generate time slots
  while (startTime.isBefore(endTime) || startTime.isSame(endTime)) {
    timeSlots.push(startTime);
    startTime = startTime.add(15, "minute");
  }
  //   console.log("timeSlots:", timeSlots[timeSlots.length - 1]);

  const borderStyle = `${CovBorderThick}px solid #E8E8E8`; // Define the border style
  const timeTextColor = "#AFAFAF";

  const timeCellStyles = {
    color: timeTextColor,
    fontSize: 12,
    textAlign: "right" as const,
    verticalAlign: "middle",
    width: CovTimeColWidth,
    padding: `0 ${CovTimeColPadR}px 0 0`,
    border: "none",
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell rowSpan={2} style={timeCellStyles}>
              {timeSlots[0].format("HH:mm")}
            </TableCell>
            {WeekDays.map((day, index) => (
              <TableCell
                key={`${day}-${index}`}
                style={{
                  textAlign: "center",
                  verticalAlign: "bottom",
                  height: CovHeadRowHeight,
                  width: dayColWidth,
                  padding: 0,
                  borderBottom: borderStyle,
                }}
              >
                {day.slice(0, 3)}
              </TableCell>
            ))}
          </TableRow>
          {timeSlots.slice(1).map((time, index) => (
            <TableRow key={time.valueOf()}>
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <React.Fragment key={`${dayIndex}-${index}`}>
                  {dayIndex === 0 &&
                    (time.minute() === 0 || time.minute() === 30) && (
                      <TableCell
                        rowSpan={dayIndex === 0 ? 2 : 1}
                        style={timeCellStyles}
                      >
                        {dayIndex === 0 &&
                        time.minute() === 0 &&
                        !time.isSame(timeSlots[timeSlots.length - 1])
                          ? time.format("HH:mm")
                          : null}
                      </TableCell>
                    )}
                  <TableCell
                    style={{
                      height: CovBodyRowHeight,
                      width: dayColWidth,
                      padding: 0,
                      borderRight: dayIndex !== 6 ? borderStyle : "none",
                      borderBottom: time.minute() === 0 ? borderStyle : "none",
                    }}
                  ></TableCell>
                </React.Fragment>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
