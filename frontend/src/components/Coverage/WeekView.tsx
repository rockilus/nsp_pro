import React from "react";
import dayjs from "dayjs";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const WeekView: React.FC = () => {
  // Generate time slots with 15-minute intervals
  const timeSlots: dayjs.Dayjs[] = [];
  let startTime = dayjs().startOf("day");
  const endTime = dayjs(startTime).add(1, "day").startOf("day");
  //   console.log("endTime:", endTime.format("HH:mm"));

  // Loop through 15-minute intervals and generate time slots
  while (startTime.isBefore(endTime) || startTime.isSame(endTime)) {
    timeSlots.push(startTime);
    startTime = startTime.add(15, "minute");
  }
  //   console.log("timeSlots:", timeSlots[timeSlots.length - 1]);

  const cellHeight = 12; // Define the height of each cell
  const timeColWidth = 50; // Define the width of the time column
  const dayColWidth = 100; // Define the width of each day column
  const borderStyle = "1px solid #E8E8E8"; // Define the border style
  const timeTextColor = "#AFAFAF";

  const timeCellStyles = {
    color: timeTextColor,
    fontSize: 12,
    textAlign: "right" as const,
    verticalAlign: "middle",
    width: timeColWidth,
    padding: "0 10px 0 0",
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
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day, index) => (
              <TableCell
                key={`${day}-${index}`}
                style={{
                  textAlign: "center",
                  verticalAlign: "bottom",
                  height: cellHeight,
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
                      height: cellHeight,
                      width: dayColWidth,
                      padding: 0,
                      borderRight: dayIndex !== 6 ? borderStyle : "none",
                      borderBottom: time.minute() === 0 ? borderStyle : "none",
                    }}
                  >
                    {/* You can add event components here based on time slots and days */}
                  </TableCell>
                </React.Fragment>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WeekView;
