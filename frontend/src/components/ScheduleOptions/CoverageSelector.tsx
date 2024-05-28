import React, { useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "react-i18next";
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
import TableAddButton from "../SharedComponents/TableAddButton";
// Stores
import { useCoverageSelectorStore } from "../../stores/coverageSelectorStore";
// Types
import { CoverageSelectorT } from "./types";
import { TeamT } from "../../containers/types";
import { CoverageT } from "../Coverage/types";
import { ScheduleT } from "../Schedule/types";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  schedule: ScheduleT;
  coverageSelectors: CoverageSelectorT[];
  coverages: CoverageT[];
}

export default function CoverageSelector({
  team,
  schedule,
  coverageSelectors,
  coverages,
}: Props) {
  const { t } = useTranslation();

  const columns = useMemo(() => {
    const coverageSelectorColumns: Record<string, string>[] = [
      { name: "full_period", label: t("campaign.full_period") },
      { name: "start_date", label: t("common.start") },
      { name: "end_date", label: t("common.end") },
      { name: "coverage", label: t("common.planner") },
    ];
    return coverageSelectorColumns;
  }, [t]);

  const addCoverageSelector = useCoverageSelectorStore(
    (state) => state.addCoverageSelector
  );
  const updateCoverageSelector = useCoverageSelectorStore(
    (state) => state.updateCoverageSelector
  );
  const deleteCoverageSelector = useCoverageSelectorStore(
    (state) => state.deleteCoverageSelector
  );

  // Rows
  const handleAddCoverageSelector = async () => {
    const newCoverageSelector: CoverageSelectorT = {
      id: "",
      scheduleId: schedule.id,
      fullPeriod: true,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      coverageId: "",
    };
    await addCoverageSelector(newCoverageSelector, team.id);
  };

  const handleUpdateCoverageId = (
    event: SelectChangeEvent,
    coverageSelector: CoverageSelectorT
  ) => {
    const updatedCoverageSelector: CoverageSelectorT = {
      ...coverageSelector,
      coverageId: event.target.value as string,
    };
    updateCoverageSelector(updatedCoverageSelector, team.id);
  };

  const handleDeleteCoverageSelector = (rowId: string) => {
    deleteCoverageSelector(rowId, team.id);
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
                      {t("coverage.planners")}
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
                      updateCoverageSelector(
                        {
                          ...coverageSelector,
                          fullPeriod: !coverageSelector.fullPeriod,
                        },
                        team.id
                      )
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
                      updateCoverageSelector(
                        {
                          ...coverageSelector,
                          startDate: dayjs.utc(newValue),
                        },
                        team.id
                      );
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
                      updateCoverageSelector(
                        {
                          ...coverageSelector,
                          endDate: dayjs.utc(newValue),
                        },
                        team.id
                      );
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
                    text={t("common.planner")}
                    handleClick={handleAddCoverageSelector}
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
