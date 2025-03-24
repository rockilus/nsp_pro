import React, { useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import DeleteIcon from "@mui/icons-material/Delete";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Styles
import "./coverage-campaign-config.css";
import "../../styles/text-styles.css";
// Types
import { CoverageSelectorT } from "../../types/campaign";
import { CoverageT } from "../../types/coverage";
import { ScheduleT } from "../../types/schedule";

dayjs.extend(utc);

export default function CoverageCampaignConfig({
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
      <div className="select-coverage-container">
        <FormControl fullWidth>
          <Select
            className="custom-planner-select"
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={
              coverageSelector.coverageId
                ? coverages.find(
                    (coverage) => coverage.id === coverageSelector.coverageId
                  )
                  ? coverageSelector.coverageId
                  : ""
                : ""
            }
            onChange={(e) => handleUpdateCoverageId(e, coverageSelector)}
            sx={{ fontSize: "0.875rem" }}
          >
            {coverages.map((coverage) => (
              <MenuItem
                className="custom-planner-menu-item"
                key={coverage.id}
                value={coverage.id}
                sx={{ fontSize: "0.875rem" }}
              >
                {coverage.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    );
  };

  return (
    <div className="coverage-campaign-config-container">
      <span className="title">{t("planners")}</span>
      <div className="coverage-selector-table-container">
        <TableContainer sx={{ overflow: "hidden" }}>
          <Table stickyHeader aria-label="simple table">
            <TableHead>
              <TableRow>
                {columns.map((column, colIndex) => (
                  <TableCell
                    key={colIndex}
                    component="th"
                    scope="row"
                    sx={{ padding: 0 }}
                  >
                    <div className="column-label-container">
                      <span className="column-label">{column.label}</span>
                    </div>
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
                  <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                    <div className="cell-content-container">
                      <Checkbox
                        checked={coverageSelector.fullPeriod}
                        onChange={() =>
                          handleUpdateCoverageSelector({
                            ...coverageSelector,
                            fullPeriod: !coverageSelector.fullPeriod,
                          })
                        }
                        sx={{ padding: 0 }}
                      />
                    </div>
                  </TableCell>
                  <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                    <DatePicker
                      className="custom-date-picker"
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
                  <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                    <div className="cell-content-container">
                      <DatePicker
                        className="custom-date-picker"
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
                      />{" "}
                    </div>
                  </TableCell>
                  <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                    <div className="cell-content-container">
                      {selectCoverage(coverageSelector)}
                    </div>
                  </TableCell>
                  <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                    <div className="cell-content-container">
                      <Button
                        onClick={() =>
                          handleDeleteCoverageSelector(coverageSelector.id)
                        }
                      >
                        <DeleteIcon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <div>
        <button
          className="add-planner-button"
          onClick={() =>
            handleAddCoverageSelector({
              id: "",
              scheduleId: schedule.id,
              fullPeriod: true,
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              coverageId: "",
              lastModified: dayjs.utc().unix(),
            })
          }
        >
          <AddIcon sx={{ height: "17px" }} />
          {t("planner")}
        </button>
      </div>
    </div>
  );
}
