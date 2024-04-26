import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import DraftsIcon from "@mui/icons-material/Drafts";
import InboxIcon from "@mui/icons-material/Inbox";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
// Components
import TableRowScheduleWIP from "../../Schedule/ScheduleOptions/TableRowScheduleWIP";
import PopoverAnchorElOver from "../../SharedComponents/PopoverAnchorElOver";
import ShiftOptionsDisplay from "./ShiftOptionsDisplay";
// Stores
import { useStatsOptionsStore } from "../../../stores/statsOptionsStore";
import { useStatStore } from "../../../stores/statStore";
// Types
import { StatsOptionsT, StatsShiftOptionsT } from "../types";
import { TeamT } from "../../../containers/types";
import { TemplateOptionValueT } from "../../Constraint/types";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  statsOptions: StatsOptionsT;
  statsShiftOptions: StatsShiftOptionsT;
}

export default function StatsOptions({
  team,
  statsOptions,
  statsShiftOptions,
}: Props) {
  const [statsOptionsState, setStatsOptionsState] =
    useState<StatsOptionsT>(statsOptions);
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<string>("last_12_months");
  const [selectTableValue, setSelectedTableValue] = useState<string>("");
  const [selectTableColumn, setSelectedTableColumn] = useState<string>("");
  const [selectedShifts, setSelectedShifts] = useState<TemplateOptionValueT[]>(
    []
  );
  console.log("selectedShifts", selectedShifts);

  const addStatsOptions = useStatsOptionsStore(
    (state) => state.addStatsOptions
  );
  const updateStatsOptions = useStatsOptionsStore(
    (state) => state.updateStatsOptions
  );
  const fetchStats = useStatStore((state) => state.fetchStats);
  const shiftOptions = useStatStore((state) => state.shiftOptions);
  const fetchShiftOptions = useStatStore((state) => state.fetchShiftOptions);

  const updateStatsOptionsStartDate = (newValue: dayjs.Dayjs) => {
    const updatedStatsOptions = { ...statsOptionsState, startDate: newValue };
    setStatsOptionsState(updatedStatsOptions);
    handleSave(updatedStatsOptions);
  };

  const updateStatsOptionsEndDate = (newValue: dayjs.Dayjs) => {
    const updatedStatsOptions = { ...statsOptionsState, endDate: newValue };
    setStatsOptionsState(updatedStatsOptions);
    handleSave(updatedStatsOptions);
  };

  const handleSave = (newStatsOptions: StatsOptionsT) => {
    if (newStatsOptions.id) {
      updateStatsOptions(newStatsOptions);
    } else {
      addStatsOptions(newStatsOptions);
    }
  };

  const handleChangeSelectedValue = (event: SelectChangeEvent) => {
    setSelectedTableValue(event.target.value as string);
  };

  const handleChangeSelectedColumn = (event: SelectChangeEvent) => {
    setSelectedTableColumn(event.target.value as string);
  };

  const handleChangeSelectedTimeFrame = (event: SelectChangeEvent) => {
    setSelectedTimeFrame(event.target.value as string);
  };

  const handleGetStats = () => {
    fetchStats(
      selectedTimeFrame,
      selectTableValue,
      selectTableColumn,
      selectedShifts,
      team.id
    );
  };

  const handleGetShiftOptions = () => {
    fetchShiftOptions(team.id);
  };

  const handleEditSelectedShifts = (
    newSelectedShifts: TemplateOptionValueT[]
  ) => {
    setSelectedShifts(newSelectedShifts);
  };

  console.log("shiftOptions", shiftOptions);

  const timeOptions = [
    { name: "last_12_months", label: "Last 12 months" },
    { name: "last_24_months", label: "Last 24 months" },
    { name: "last_36_months", label: "Last 36 months" },
    { name: "custom", label: "Custom" },
  ];

  const valueOptions: Record<string, string>[] = [
    { name: "custom", label: "Custom", description: "Custom stats" },
    {
      name: "nb_days_worked",
      label: "Nb days worked",
      description: "Number of days worked",
    },
    {
      name: "time_worked",
      label: "Time worked",
      description: "Total time worked",
    },
    {
      name: "nb_shifts_worked",
      label: "Nb shifts worked",
      description: "Number of shifts worked",
    },
    {
      name: "nb_rest_days",
      label: "Nb rest days",
      description: "Number of rest days",
    },
    {
      name: "nb_rest_shifts",
      label: "Nb rest shifts",
      description: "Number of rest shifts",
    },
    {
      name: "nb_times_shift",
      label: "Nb time shift",
      description: "Number of times a shift was worked",
    },
    {
      name: "nb_times_rest",
      label: "Nb time rest",
      description: "Number of times a rest was taken",
    },
  ];

  const columnOptions = [
    { name: "weekday", label: "Weekday" },
    { name: "week", label: "Week" },
    { name: "month", label: "Month" },
    { name: "year", label: "Year" },
    { name: "all", label: "All" },
  ];

  console.log("statsOptions", statsOptions);

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
          Stats
        </Typography>
      </Box>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table aria-label="simple table">
          <TableBody>
            <TableRowScheduleWIP
              name="Time frame"
              content={
                <FormControl fullWidth>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={selectedTimeFrame}
                    onChange={handleChangeSelectedTimeFrame}
                  >
                    {timeOptions.map((option, index) => (
                      <MenuItem key={index} value={option.name}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              }
            />
            <TableRowScheduleWIP
              name="Start"
              content={
                <DatePicker
                  value={statsOptionsState.startDate}
                  onChange={(newValue) => {
                    updateStatsOptionsStartDate(
                      newValue
                        ? dayjs.utc(newValue).startOf("day")
                        : dayjs.utc().startOf("day")
                    );
                  }}
                />
              }
            />
            <TableRowScheduleWIP
              name="End"
              content={
                <DatePicker
                  value={statsOptionsState.endDate}
                  onChange={(newValue) => {
                    updateStatsOptionsEndDate(
                      newValue
                        ? dayjs.utc(newValue).startOf("day")
                        : dayjs.utc().startOf("day")
                    );
                  }}
                />
              }
            />

            <TableRowScheduleWIP
              name="Stats"
              content={
                <FormControl fullWidth>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={selectTableValue}
                    onChange={handleChangeSelectedValue}
                  >
                    {valueOptions.map((option, index) => (
                      <MenuItem key={index} value={option.name}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              }
            />
            <TableRowScheduleWIP
              name="Frequency"
              content={
                <FormControl fullWidth>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={selectTableColumn}
                    onChange={handleChangeSelectedColumn}
                  >
                    {columnOptions.map((option, index) => (
                      <MenuItem key={index} value={option.name}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              }
            />
            <TableRowScheduleWIP
              name="Shifts"
              content={
                <ShiftOptionsDisplay
                  selectedShifts={selectedShifts}
                  statsShiftOptions={statsShiftOptions}
                  handleEditSelectedShifts={handleEditSelectedShifts}
                />
              }
            />
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
        }}
      >
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
        <Button
          variant="contained"
          color="primary"
          onClick={handleGetShiftOptions}
          sx={{
            paddingLeft: 0.2,
            paddingRight: 0.2,
            margin: "8px",
            height: "35px",
          }}
        >
          Get shift options
        </Button>
      </Box>
    </Box>
  );
}
