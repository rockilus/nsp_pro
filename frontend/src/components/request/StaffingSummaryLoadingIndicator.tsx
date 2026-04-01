import React from "react";
import { Dayjs } from "dayjs";
import "./StaffingSummaryLoadingIndicator.css";

export const StaffingSummaryLoadingIndicator: React.FC<{ days: Dayjs[] }> = ({
  days,
}) => (
  <>
    {["Program staffing requirement", "Current staff available", "Delta"].map(
      (label, rowIndex) => (
        <div className="calendar-row" key={`loading-row-${rowIndex}`}>
          <div
            className="calendar-row__name skeleton-loader"
            style={{ height: "40px" }}
          >
            <div
              className="skeleton-pulse"
              style={{ height: "100%", width: "100%" }}
            />
          </div>
          <div className="calendar-row__days">
            {days.map((_, i) => (
              <div
                key={`loading-cell-${rowIndex}-${i}`}
                className="calendar-cell skeleton-loader"
              >
                <div
                  className="skeleton-pulse"
                  style={{ height: "100%", width: "100%" }}
                />
              </div>
            ))}
          </div>
        </div>
      ),
    )}
  </>
);
