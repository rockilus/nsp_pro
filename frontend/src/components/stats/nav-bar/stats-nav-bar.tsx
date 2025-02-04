import React, { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import ShiftOptionsDisplay from "./shift-options-display";
// Styles
import "./stats-nav-bar.css";
// Types
import {
  StatsOptionsT,
  StatsTimeFrameOptions,
  StatsUnitOptions,
  HeaderUnitOptions,
} from "../../../types/stats";
import { ShiftWorkerOptionT, SWOIdTypes } from "../../../types/constraint";
import { ScheduleT } from "../../../types/schedule";

export default function StatsNavBar({
  lng,
  scheduleCampaign,
  statsOptions,
  statsUnitOptions,
  shiftOptions,
  handleUpdateStatsOptions,
}: // statsShiftOptions,
// statsUnitOptions,
// setShowingCustom,
// handleGetStats,
{
  lng: string;
  scheduleCampaign: ScheduleT | null;
  statsOptions: StatsOptionsT;
  statsUnitOptions: {
    name: StatsUnitOptions;
    label: string;
    description: string;
  }[];
  shiftOptions: ShiftWorkerOptionT[];
  handleUpdateStatsOptions: (statsOptions: StatsOptionsT) => void;
  // shiftOptions: ShiftWorkerOptionT[];
  // setShowingCustom: (showingCustom: boolean) => void;
  // handleGetStats: (statsOptions: StatsOptionsT) => void;
}) {
  const { t } = useTranslation(lng, "stats-page");

  const [showFavorites, setShowFavorites] = useState<boolean>(false);

  const startDateLTM = dayjs.utc().startOf("day").subtract(1, "year");
  const endDateLTM = dayjs.utc().startOf("day");

  const timeFrameOptions: { name: StatsTimeFrameOptions; label: string }[] = [
    { name: StatsTimeFrameOptions.CAMPAING, label: t("campaign") },
    { name: StatsTimeFrameOptions.LTM, label: t("time_frame_ltm") },
    { name: StatsTimeFrameOptions.CUSTOM, label: t("time_frame_custom") },
  ];

  const headerUnitOptions: { name: HeaderUnitOptions; label: string }[] = [
    { name: HeaderUnitOptions.WEEKDAY, label: t("frequency_weekday") },
    { name: HeaderUnitOptions.WEEK, label: t("frequency_week") },
    { name: HeaderUnitOptions.MONTH, label: t("frequency_month") },
    { name: HeaderUnitOptions.YEAR, label: t("frequency_year") },
    { name: HeaderUnitOptions.ALL, label: t("frequency_all") },
  ];

  const handleChangeStatsTimeFrame = (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    value: StatsTimeFrameOptions | null
  ) => {
    if (value !== null && value !== statsOptions.timeFrame) {
      const newStartDate =
        value === StatsTimeFrameOptions.CAMPAING
          ? scheduleCampaign
            ? scheduleCampaign.startDate
            : startDateLTM
          : value === StatsTimeFrameOptions.LTM
          ? startDateLTM
          : statsOptions.startDate;
      const newEndDate =
        value === StatsTimeFrameOptions.CAMPAING
          ? scheduleCampaign
            ? scheduleCampaign.endDate
            : endDateLTM
          : value === StatsTimeFrameOptions.LTM
          ? endDateLTM
          : statsOptions.endDate;
      const newStatsOptions = {
        ...statsOptions,
        timeFrame: value,
        startDate: newStartDate,
        endDate: newEndDate,
      };
      handleUpdateStatsOptions(newStatsOptions);
    }
  };

  const handleChangeStartDate = (date: dayjs.Dayjs | null) => {
    if (date) {
      const newStatsOptions = {
        ...statsOptions,
        startDate: date,
      };
      handleUpdateStatsOptions(newStatsOptions);
    }
  };

  const handleChangeEndDate = (date: dayjs.Dayjs | null) => {
    if (date) {
      const newStatsOptions = {
        ...statsOptions,
        endDate: date,
      };
      handleUpdateStatsOptions(newStatsOptions);
    }
  };

  const handleChangeStatsUnit = (
    event: SelectChangeEvent<StatsUnitOptions>
  ) => {
    const value = event.target.value as StatsUnitOptions;
    const newStatsOptions = {
      ...statsOptions,
      statsUnit: value,
    };
    handleUpdateStatsOptions(newStatsOptions);
  };

  const handleChangeHeaderUnit = (
    event: SelectChangeEvent<HeaderUnitOptions>
  ) => {
    const value = event.target.value as HeaderUnitOptions;
    const newStatsOptions = {
      ...statsOptions,
      headerUnit: value,
    };
    handleUpdateStatsOptions(newStatsOptions);
  };

  const handleEditSelectedShifts = (selectedShifts: ShiftWorkerOptionT[]) => {
    const newStatsOptions = {
      ...statsOptions,
      selectedShifts,
    };
    handleUpdateStatsOptions(newStatsOptions);
  };

  return (
    <div className="stats-nav-bar-container">
      <div className="stats-time-options-container">
        <ToggleButtonGroup
          color="primary"
          value={statsOptions.timeFrame}
          exclusive
          onChange={handleChangeStatsTimeFrame}
          aria-label="Platform"
        >
          {timeFrameOptions.map((option) => (
            <ToggleButton
              key={option.name}
              value={option.name}
              sx={{
                textTransform: "none",
                height: "30px",
                fontSize: "0.8rem",
              }}
              disabled={
                option.name === StatsTimeFrameOptions.CAMPAING &&
                !scheduleCampaign
              }
            >
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <div>
          <DatePicker
            value={statsOptions.startDate}
            disabled={statsOptions.timeFrame !== StatsTimeFrameOptions.CUSTOM}
            onChange={handleChangeStartDate}
            sx={{
              width: "160px",
              "& .MuiOutlinedInput-input": {
                fontSize: "0.875rem",
                height: "40px",
                paddingY: 0,
              },
            }}
          />
          <DatePicker
            value={statsOptions.endDate}
            disabled={statsOptions.timeFrame !== StatsTimeFrameOptions.CUSTOM}
            onChange={handleChangeEndDate}
            sx={{
              width: "160px",
              "& .MuiOutlinedInput-input": {
                fontSize: "0.875rem",
                height: "40px",
                paddingY: 0,
              },
            }}
          />
        </div>
      </div>
      <IconButton
        onClick={() => setShowFavorites((prevState) => !prevState)}
        sx={{
          borderRadius: "50%",
          backgroundColor: showFavorites
            ? "rgba(255, 0, 0, 0.1)"
            : "transparent",
          "&:hover": {
            backgroundColor: showFavorites
              ? "rgba(255, 0, 0, 0.2)"
              : "rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        {showFavorites ? <FavoriteIcon /> : <FavoriteBorderIcon />}
      </IconButton>
      <FormControl>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={statsOptions.statsUnit}
          onChange={handleChangeStatsUnit}
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
      <FormControl>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={statsOptions.headerUnit}
          onChange={handleChangeHeaderUnit}
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
      </FormControl>{" "}
      <ShiftOptionsDisplay
        lng={lng}
        selectedShifts={statsOptions.selectedShifts}
        statsShiftOptions={shiftOptions}
        handleEditSelectedShifts={handleEditSelectedShifts}
      />
    </div>
  );
}
