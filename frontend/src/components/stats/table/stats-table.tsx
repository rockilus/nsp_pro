import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Styles
import "./stats-table.css";
// Types
import {
  StatsT,
  StatsValueT,
  StatsHeaderT,
  HeaderUnitOptions,
  StatsUnitOptions,
} from "../../../types/stats";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";

export default function StatsTable({
  lng,
  stats,
  showingCustom,
  workers,
  shifts,
  statsUnitOptions,
  quickStats,
  handleAddHeader,
  handleDeleteHeader,
}: {
  lng: string;
  stats: StatsT;
  showingCustom: boolean;
  workers: WorkerT[];
  shifts: ShiftT[];
  statsUnitOptions: {
    name: StatsUnitOptions;
    label: string;
    description: string;
  }[];
  quickStats: boolean;
  handleAddHeader: (header: StatsHeaderT) => void;
  handleDeleteHeader: (headerId: string) => void;
}) {
  const { t } = useTranslation(lng, "stats-page");
  const { t: t_weekdays } = useTranslation(lng, "week_days");
  const { t: t_months } = useTranslation(lng, "months");

  const borderStyle = "1px solid #E8E8E8";

  const handleAddDeleteHeaderToCustom = (statsHeader: StatsHeaderT) => {
    if (statsHeader.isFavorite) {
      handleDeleteHeader(statsHeader.id);
    } else {
      handleAddHeader(statsHeader);
    }
  };

  // const translateHeaderValue = (name: string): string => {
  //   const translations: Record<string, string> = {
  //     Monday: "week_days.monday",
  //     Tuesday: "week_days.tuesday",
  //     Wednesday: "week_days.wednesday",
  //     Thursday: "week_days.thursday",
  //     Friday: "week_days.friday",
  //     Saturday: "week_days.saturday",
  //     Sunday: "week_days.sunday",
  //   };

  //   const weekPattern = /^(\d{4}) W(\d{1,2})$/;
  //   const match = name.match(weekPattern);

  //   if (match) {
  //     const year = match[1];
  //     const week = match[2];
  //     return `${year} ${t("stats.week_short")}${week}`;
  //   }

  //   return translations[name] ? t(translations[name]) : name;
  // };

  const translateHeaderValue = (name: string): string => {
    const translations: Record<string, string> = {
      Monday: t_weekdays("monday"),
      Tuesday: t_weekdays("tuesday"),
      Wednesday: t_weekdays("wednesday"),
      Thursday: t_weekdays("thursday"),
      Friday: t_weekdays("friday"),
      Saturday: t_weekdays("saturday"),
      Sunday: t_weekdays("sunday"),
    };

    const weekPattern = /^(\d{4}) W(\d{1,2})$/;
    const monthPattern =
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/;
    const matchWeek = name.match(weekPattern);
    const matchMonth = name.match(monthPattern);

    const monthAbbreviations: Record<string, string> = {
      jan: t_months("january"),
      feb: t_months("february"),
      mar: t_months("march"),
      apr: t_months("april"),
      may: t_months("may"),
      jun: t_months("june"),
      jul: t_months("july"),
      aug: t_months("august"),
      sep: t_months("september"),
      oct: t_months("october"),
      nov: t_months("november"),
      dec: t_months("december"),
    };

    if (matchWeek) {
      const year = matchWeek[1];
      const week = matchWeek[2];
      return `${year} ${t("week_short")}${week}`;
    }

    if (matchMonth) {
      const monthAbbreviation = matchMonth[1].toLowerCase();
      const month = monthAbbreviations[monthAbbreviation];
      const year = matchMonth[2];
      return `${month.substring(0, 3)} ${year}`;
    }

    return translations[name] ? translations[name].substring(0, 3) : name;
  };

  return (
    <TableContainer sx={{ height: "calc(100vh - 130px)" }}>
      <Table stickyHeader sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ padding: 0 }}></TableCell>
            {stats.statsHeaders.map((header, headerIndex) => (
              <TableCell key={headerIndex} align="center" sx={{ padding: 0 }}>
                <div className="column-header-container">
                  <span
                    className={`column-header ${
                      quickStats ? "quick-stats" : ""
                    }`}
                  >
                    {header.headerUnit === HeaderUnitOptions.SHIFT
                      ? shifts.find((s) => s.id === header.value)?.name
                      : translateHeaderValue(header.value)}
                  </span>
                  {showingCustom && (
                    <div className="column-header-custom-info">
                      <span
                        className={`column-header-stats-unit ${
                          quickStats ? "quick-stats" : ""
                        }`}
                      >
                        {statsUnitOptions.find(
                          (u) => u.name === header.statsUnit
                        )?.label || header.statsUnit}
                      </span>
                      <span
                        className={`column-header-shift-name ${
                          quickStats ? "quick-stats" : ""
                        }`}
                      >
                        {header.selectedShifts
                          .map((ss) =>
                            ss.name === "all shifts" ? t("all_shifts") : ss.name
                          )
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {!quickStats && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className={`custom-button ${
                          header.isFavorite ? "in-custom" : ""
                        }`}
                        onClick={() => handleAddDeleteHeaderToCustom(header)}
                      >
                        {t("custom")}
                      </button>
                    </div>
                  )}
                </div>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {workers.map((worker, wIndex) => (
            <TableRow key={wIndex}>
              <TableCell
                align="left"
                sx={{ padding: 0, height: quickStats ? "25px" : "30px" }}
              >
                <span
                  className={`row-worker-name ${
                    quickStats ? "quick-stats" : ""
                  }`}
                >
                  {worker.name}
                </span>
              </TableCell>
              {stats.statsHeaders.map((header, headerIndex) => {
                const statsValue: StatsValueT | null =
                  stats.statsValues.find(
                    (s) => s.headerId === header.id && s.workerId === worker.id
                  ) || null;
                return (
                  statsValue && (
                    <TableCell
                      key={wIndex + headerIndex}
                      align="center"
                      sx={{ padding: 0 }}
                    >
                      <span
                        className={`row-value ${
                          quickStats ? "quick-stats" : ""
                        }`}
                      >
                        {statsValue.value}
                      </span>
                    </TableCell>
                  )
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
