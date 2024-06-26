import React, { useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import DeleteIcon from "@mui/icons-material/Delete";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import TableAddButton from "../buttons/table-add-button";
// Types
import { CoverageSelectorT } from "../../types/campaign";
import { CoverageT } from "../../types/coverage";
import { ScheduleT } from "../../types/schedule_temp";

dayjs.extend(utc);

export default function CoverageSelector({
  lng,
  schedule,
  coverageSelectors,
  coverages,
  handleAddCoverageSelector,
  handleUpdateCoverageSelector,
  handleDeleteCoverageSelector,
}: {
  lng: string;
  schedule: ScheduleT;
  coverageSelectors: CoverageSelectorT[];
  coverages: CoverageT[];
  handleAddCoverageSelector: (coverageSelector: CoverageSelectorT) => void;
  handleUpdateCoverageSelector: (coverageSelector: CoverageSelectorT) => void;
  handleDeleteCoverageSelector: (coverageSelectorId: string) => void;
}) {
  const { t } = useTranslation(lng, "campaign-page");

  const columns = useMemo(() => {
    const coverageSelectorColumns: Record<string, string>[] = [
      { name: "full_period", label: t("full_period") },
      { name: "start_date", label: t("start") },
      { name: "end_date", label: t("end") },
      { name: "coverage", label: t("planner") },
    ];
    return coverageSelectorColumns;
  }, [t]);

  const handleUpdateCoverageId = (
    event: SelectChangeEvent,
    coverageSelector: CoverageSelectorT
  ) => {
    const updatedCoverageSelector: CoverageSelectorT = {
      ...coverageSelector,
      coverageId: event.target.value as string,
    };
    handleUpdateCoverageSelector(updatedCoverageSelector);
  };

  const selectCoverage = (coverageSelector: CoverageSelectorT) => {
    return (
      <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={
              coverages.find(
                (coverage) => coverage.id === coverageSelector.coverageId
              )
                ? coverageSelector.coverageId
                : ""
            }
            onChange={(e) => handleUpdateCoverageId(e, coverageSelector)}
          >
            {coverages.map((coverage) => (
              <MenuItem key={coverage.id} value={coverage.id}>
                {coverage.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        border: "1px solid grey",
        margin: 2,
        marginTop: 0,
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
      }}
    >
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              <TableCell colSpan={columns.length + 1} sx={{ paddingY: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 45,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {t("planners")}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              {columns.map((column, colIndex) => (
                <TableCell
                  key={colIndex}
                  component="th"
                  scope="row"
                  sx={{ paddingY: 0, fontWeight: "bold" }}
                >
                  <Box
                    sx={{
                      minHeight: 45,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {column.label}
                  </Box>
                </TableCell>
              ))}
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coverageSelectors.map((coverageSelector) => (
              <TableRow
                key={coverageSelector.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Checkbox
                    checked={coverageSelector.fullPeriod}
                    onChange={() =>
                      handleUpdateCoverageSelector({
                        ...coverageSelector,
                        fullPeriod: !coverageSelector.fullPeriod,
                      })
                    }
                  />
                </TableCell>
                <TableCell component="th" scope="row">
                  <DatePicker
                    disabled={coverageSelector.fullPeriod}
                    minDate={schedule.startDate}
                    maxDate={coverageSelector.endDate}
                    value={dayjs(coverageSelector.startDate)}
                    onChange={(newValue) => {
                      if (!newValue) return;
                      handleUpdateCoverageSelector({
                        ...coverageSelector,
                        startDate: dayjs.utc(newValue),
                      });
                    }}
                  />
                </TableCell>
                <TableCell component="th" scope="row">
                  <DatePicker
                    disabled={coverageSelector.fullPeriod}
                    minDate={coverageSelector.startDate}
                    maxDate={schedule.endDate}
                    value={dayjs(coverageSelector.endDate)}
                    onChange={(newValue: dayjs.Dayjs | null) => {
                      if (!newValue) return;
                      handleUpdateCoverageSelector({
                        ...coverageSelector,
                        endDate: dayjs.utc(newValue),
                      });
                    }}
                  />
                </TableCell>
                <TableCell component="th" scope="row">
                  {selectCoverage(coverageSelector)}
                </TableCell>
                <TableCell component="th" scope="row">
                  <Box sx={{ display: "flex" }}>
                    <Button
                      onClick={() =>
                        handleDeleteCoverageSelector(coverageSelector.id)
                      }
                    >
                      <DeleteIcon />
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: "grey.100" }}>
              <TableCell colSpan={columns.length + 1} sx={{ paddingY: 0 }}>
                <Box display="flex" alignItems="center" minHeight={45}>
                  <TableAddButton
                    text={t("planner")}
                    handleClick={() =>
                      handleAddCoverageSelector({
                        id: "",
                        scheduleId: schedule.id,
                        fullPeriod: true,
                        startDate: schedule.startDate,
                        endDate: schedule.endDate,
                        coverageId: "",
                      })
                    }
                  />
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
