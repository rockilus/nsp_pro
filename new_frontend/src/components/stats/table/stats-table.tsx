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
      Monday: "week_days.monday",
      Tuesday: "week_days.tuesday",
      Wednesday: "week_days.wednesday",
      Thursday: "week_days.thursday",
      Friday: "week_days.friday",
      Saturday: "week_days.saturday",
      Sunday: "week_days.sunday",
    };

    const weekPattern = /^(\d{4}) W(\d{1,2})$/;
    const monthPattern =
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/;
    const matchWeek = name.match(weekPattern);
    const matchMonth = name.match(monthPattern);

    const monthAbbreviations: Record<string, string> = {
      jan: "january",
      feb: "february",
      mar: "march",
      apr: "april",
      may: "may",
      jun: "june",
      jul: "july",
      aug: "august",
      sep: "september",
      oct: "october",
      nov: "november",
      dec: "december",
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
      return `${t(`month_names.${month}`).substring(0, 3)} ${year}`;
    }

    return translations[name] ? t(translations[name]) : name;
  };

  return (
    <Box
      sx={{
        border: "1px solid grey",
        margin: 2,
        marginLeft: 0,
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
        width: "100%",
      }}
    >
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              <TableCell></TableCell>
              {stats.statsHeaders.map((header, headerIndex) => (
                <TableCell
                  key={headerIndex}
                  align="center"
                  // sx={{ borderLeft: headerIndex > 0 ? borderStyle : null }}
                >
                  {showingCustom && (
                    <Typography variant="body1" sx={{ fontSize: "0.8rem" }}>
                      {statsUnitOptions.find((u) => u.name === header.statsUnit)
                        ?.label || header.statsUnit}
                    </Typography>
                  )}
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {header.headerUnit === "shift"
                      ? shifts.find((s) => s.id === header.value)?.name
                      : translateHeaderValue(header.value)}
                  </Typography>
                  <Button
                    sx={{
                      fontStyle: "italic",
                      fontSize: "0.7rem",
                      padding: "1px",
                      borderRadius: 4,
                      textTransform: "none",
                      border: "1px solid",
                      height: "25px",
                      color: "grey.700",
                      backgroundColor: header.inCustom ? "grey.300" : "none",
                      boxShadow: header.inCustom
                        ? "inset 0 0 5px rgba(0,0,0,0.3)"
                        : "none",
                    }}
                    onClick={() => handleAddDeleteHeaderToCustom(header)}
                  >
                    {t("custom")}
                  </Button>
                </TableCell>
              ))}
            </TableRow>
            {showingCustom && (
              <TableRow>
                <TableCell></TableCell>
                {stats.statsHeaders.map((header, headerIndex) => (
                  <TableCell
                    key={headerIndex}
                    align="center"
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
                <TableCell align="left">{worker.name}</TableCell>
                {stats.statsHeaders.map((header, headerIndex) => {
                  const statsValue: StatsValueT | null =
                    stats.statsValues.find(
                      (s) =>
                        s.headerId === header.id && s.workerId === worker.id
                    ) || null;
                  return (
                    statsValue && (
                      <TableCell key={wIndex + headerIndex} align="center">
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
    </Box>
  );
}
