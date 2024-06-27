import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import TableRowScheduleWIP from "../../data-display/table-row-schedule-wip";
import ShiftOptionsDisplay from "./shift-options-display";
// Types
import { StatsShiftOptionsT, StatsOptionsT } from "../../../types/stats";
import { TemplateOptionValueT } from "../../../types/constraint";

dayjs.extend(utc);

export default function StatsOptions({
  lng,
  statsShiftOptions,
  statsUnitOptions,
  setShowingCustom,
  handleGetStats,
}: {
  lng: string;
  statsShiftOptions: StatsShiftOptionsT;
  statsUnitOptions: Record<string, string>[];
  setShowingCustom: (showingCustom: boolean) => void;
  handleGetStats: (statsOptions: StatsOptionsT) => void;
}) {
  const { t } = useTranslation(lng, "stats-page");

  const [statsOptions, setStatsOptions] = useState<StatsOptionsT>({
    timeFrame: "last_12_months",
    startDate: dayjs.utc().startOf("day").subtract(1, "year"),
    endDate: dayjs.utc().startOf("day"),
    statsUnit: "custom",
    headerUnit: "weekday",
    selectedShifts: [{ name: "all shifts", id: "", idType: "" }],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const headerUnitOptions: Record<string, string>[] = [
    { name: "weekday", label: t("frequency_weekday") },
    { name: "week", label: t("frequency_week") },
    { name: "month", label: t("frequency_month") },
    { name: "year", label: t("frequency_year") },
    { name: "all", label: t("frequency_all") },
  ];
  const timeFrameOptions: Record<string, string>[] = [
    { name: "last_12_months", label: t("time_frame_ltm") },
    { name: "last_24_months", label: t("time_frame_24_months") },
    { name: "last_36_months", label: t("time_frame_36_months") },
    { name: "custom", label: t("time_frame_custom") },
  ];

  const statsUnitWithFrequency = [
    "nb_days_worked",
    "time_worked",
    "nb_shifts_worked",
    "nb_rest_days",
    "nb_rest_shifts",
  ];

  const handleChangeSelectedStatsUnit = (event: SelectChangeEvent) => {
    setStatsOptions({
      ...statsOptions,
      statsUnit: event.target.value as string,
    });
  };

  const handleChangeSelectedHeaderUnit = (event: SelectChangeEvent) => {
    setStatsOptions({
      ...statsOptions,
      headerUnit: event.target.value as string,
    });
  };

  const handleChangeSelectedTimeFrame = (event: SelectChangeEvent) => {
    setStatsOptions({
      ...statsOptions,
      timeFrame: event.target.value as string,
    });
  };

  const handleEditSelectedShifts = (
    newSelectedShifts: TemplateOptionValueT[]
  ) => {
    setStatsOptions((prevState) => ({
      ...prevState,
      selectedShifts: newSelectedShifts,
    }));
  };

  const handleFetchStats = async () => {
    setIsLoading(true);
    await handleGetStats(statsOptions);
    setIsLoading(false);
    setShowingCustom(statsOptions.statsUnit === "custom");
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "300px",
        border: "1px solid grey",
        borderRadius: 2,
        margin: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingLeft: 1,
          borderBottom: "1px solid lightgrey",
          backgroundColor: "grey.100",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Typography
          variant="subtitle1"
          align="left"
          sx={{ fontWeight: "bold" }}
        >
          {t("stats")}
        </Typography>
      </Box>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table aria-label="simple table">
          <TableBody>
            <TableRowScheduleWIP
              name={t("time_frame")}
              content={
                <FormControl>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={statsOptions.timeFrame}
                    onChange={handleChangeSelectedTimeFrame}
                    sx={{
                      fontSize: "0.875rem",
                      height: "40px",
                      width: "160px",
                      paddingY: 0,
                    }}
                  >
                    {timeFrameOptions.map((option, index) => (
                      <MenuItem key={index} value={option.name}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              }
            />
            {statsOptions.timeFrame === "custom" && (
              <TableRowScheduleWIP
                name={t("start")}
                content={
                  <DatePicker
                    value={statsOptions.startDate}
                    onChange={(newValue) => {
                      setStatsOptions((prevState) => ({
                        ...prevState,
                        startDate: newValue
                          ? dayjs.utc(newValue).startOf("day")
                          : dayjs.utc().startOf("day"),
                      }));
                    }}
                    sx={{
                      width: "160px",
                      "& .MuiOutlinedInput-input": {
                        fontSize: "0.875rem",
                        height: "40px",
                        paddingY: 0,
                      },
                    }}
                  />
                }
              />
            )}
            {statsOptions.timeFrame === "custom" && (
              <TableRowScheduleWIP
                name={t("end")}
                content={
                  <DatePicker
                    value={statsOptions.endDate}
                    onChange={(newValue) => {
                      setStatsOptions((prevState) => ({
                        ...prevState,
                        endDate: newValue
                          ? dayjs.utc(newValue).startOf("day")
                          : dayjs.utc().startOf("day"),
                      }));
                    }}
                    sx={{
                      width: "160px",
                      "& .MuiOutlinedInput-input": {
                        fontSize: "0.875rem",
                        height: "40px",
                        paddingY: 0,
                      },
                    }}
                  />
                }
              />
            )}
            <TableRowScheduleWIP
              name={t("stats")}
              content={
                <FormControl>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={statsOptions.statsUnit}
                    onChange={handleChangeSelectedStatsUnit}
                    sx={{
                      fontSize: "0.875rem",
                      height: "40px",
                      width: "160px",
                      paddingY: 0,
                    }}
                  >
                    {statsUnitOptions.map((option, index) => (
                      <MenuItem key={index} value={option.name}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              }
            />
            {statsUnitWithFrequency.includes(statsOptions.statsUnit) && (
              <TableRowScheduleWIP
                name={t("view_by")}
                content={
                  <FormControl>
                    <Select
                      labelId="demo-simple-select-label"
                      id="demo-simple-select"
                      value={statsOptions.headerUnit}
                      onChange={handleChangeSelectedHeaderUnit}
                      sx={{
                        fontSize: "0.875rem",
                        height: "40px",
                        width: "160px",
                        paddingY: 0,
                      }}
                    >
                      {headerUnitOptions.map((option, index) => (
                        <MenuItem key={index} value={option.name}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                }
              />
            )}
            {statsOptions.statsUnit !== "custom" && (
              <TableRowScheduleWIP
                name={t("shifts")}
                content={
                  <ShiftOptionsDisplay
                    lng={lng}
                    selectedShifts={statsOptions.selectedShifts}
                    statsShiftOptions={statsShiftOptions}
                    handleEditSelectedShifts={handleEditSelectedShifts}
                  />
                }
              />
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {isLoading ? (
        <Box
          sx={{
            backgroundColor: "#1976d2",
            height: "35px",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: 1,
          }}
        >
          <CircularProgress size={20} sx={{ color: "white" }} />
        </Box>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={handleFetchStats}
          sx={{
            paddingLeft: 0.2,
            paddingRight: 0.2,
            margin: "8px",
            height: "35px",
          }}
        >
          {t("get_stats")}
        </Button>
      )}
    </Box>
  );
}
