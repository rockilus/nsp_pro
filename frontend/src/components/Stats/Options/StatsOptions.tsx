import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
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
import TableRowScheduleWIP from "../../Schedule/ScheduleOptions/TableRowScheduleWIP";
import ShiftOptionsDisplay from "./ShiftOptionsDisplay";
// Stores
import { useStatStore } from "../../../stores/statsStore";
// Types
import { StatsShiftOptionsT, StatsOptionsT } from "../types";
import { TeamT } from "../../../containers/types";
import { TemplateOptionValueT } from "../../Constraint/types";
// Constants
import {
  statsUnitOptions,
  headerUnitOptions,
  timeFrameOptions,
} from "../../../utils/constants";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  statsShiftOptions: StatsShiftOptionsT;
  setShowingCustom: (showingCustom: boolean) => void;
}

export default function StatsOptions({
  team,
  statsShiftOptions,
  setShowingCustom,
}: Props) {
  const [statsOptions, setStatsOptions] = useState<StatsOptionsT>({
    timeFrame: "last_12_months",
    startDate: dayjs.utc().startOf("day").subtract(1, "year"),
    endDate: dayjs.utc().startOf("day"),
    statsUnit: "custom",
    headerUnit: "weekday",
    selectedShifts: [{ name: "all shifts", id: "", idType: "" }],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const statsUnitWithFrequency = [
    "nb_days_worked",
    "time_worked",
    "nb_shifts_worked",
    "nb_rest_days",
    "nb_rest_shifts",
  ];

  const fetchStats = useStatStore((state) => state.fetchStats);

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

  const handleGetStats = async () => {
    setIsLoading(true);
    await fetchStats(statsOptions, team.id);
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
          Stats options
        </Typography>
      </Box>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table aria-label="simple table">
          <TableBody>
            <TableRowScheduleWIP
              name="Time frame"
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
                name="Start"
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
                name="End"
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
              name="Stats"
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
                name="Frequency"
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
                name="Shifts"
                content={
                  <ShiftOptionsDisplay
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
          onClick={handleGetStats}
          sx={{
            paddingLeft: 0.2,
            paddingRight: 0.2,
            margin: "8px",
            height: "35px",
          }}
        >
          Get stats
        </Button>
      )}
    </Box>
  );
}
