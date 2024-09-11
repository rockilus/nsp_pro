import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
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
import { StatsT, StatsValueT, StatsHeaderT } from "../../../types/stats";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";

export default function StatsTable({
  lng,
  stats,
  showingCustom,
  workers,
  shifts,
  statsUnitOptions,
  handleAddHeader,
  handleDeleteHeader,
}: {
  lng: string;
  stats: StatsT;
  showingCustom: boolean;
  workers: WorkerT[];
  shifts: ShiftT[];
  statsUnitOptions: Record<string, string>[];
  handleAddHeader: (header: StatsHeaderT) => void;
  handleDeleteHeader: (headerId: string) => void;
}) {
  const { t } = useTranslation(lng, "stats-page");
  const { t: t_weekdays } = useTranslation(lng, "week_days");
  const { t: t_months } = useTranslation(lng, "months");

  const borderStyle = "1px solid #E8E8E8";

  const handleAddDeleteHeaderToCustom = (statsHeader: StatsHeaderT) => {
    if (statsHeader.inCustom) {
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
            <TableCell sx={{ padding: 0, border: "none" }}></TableCell>
            {stats.statsHeaders.map((header, headerIndex) => (
              <TableCell
                key={headerIndex}
                align="center"
                sx={{ padding: 0, border: "none" }}
              >
                {showingCustom && (
                  <Typography variant="body1" sx={{ fontSize: "0.8rem" }}>
                    {statsUnitOptions.find((u) => u.name === header.statsUnit)
                      ?.label || header.statsUnit}
                  </Typography>
                )}
                <span className="column-header">
                  {header.headerUnit === "shift"
                    ? shifts.find((s) => s.id === header.value)?.name
                    : translateHeaderValue(header.value)}
                </span>
                <Button
                  onClick={() => handleAddDeleteHeaderToCustom(header)}
                  sx={{
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    border: "none",
                    width: "100%",
                    height: "100%",
                    textTransform: "none",
                    paddingY: "0px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: "primary",
                  }}
                  onMouseOver={(e) => {
                    (e.target as HTMLElement).style.backgroundColor =
                      "lightgrey";
                  }}
                  onMouseOut={(e) => {
                    (e.target as HTMLElement).style.backgroundColor =
                      "transparent";
                  }}
                >
                  {t("custom")}
                </Button>
              </TableCell>
            ))}
          </TableRow>
          {showingCustom && (
            <TableRow>
              <TableCell sx={{ padding: 0 }}></TableCell>
              {stats.statsHeaders.map((header, headerIndex) => (
                <TableCell
                  key={headerIndex}
                  align="center"
                  sx={{ padding: 0 }}
                  // sx={{ borderLeft: headerIndex > 0 ? borderStyle : null }}
                >
                  <Typography
                    variant="body1"
                    sx={{ fontStyle: "italic", fontSize: "0.8rem" }}
                  >
                    {header.selectedShifts
                      .map((ss) =>
                        ss.name === "all shifts" ? t("all_shifts") : ss.name
                      )
                      .join(", ")}{" "}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableHead>
        <TableBody>
          {workers.map((worker, wIndex) => (
            <TableRow key={wIndex}>
              <TableCell align="left" sx={{ padding: 0 }}>
                {worker.name}
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
                      sx={{ height: "30px", padding: 0 }}
                    >
                      {statsValue.value}
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
