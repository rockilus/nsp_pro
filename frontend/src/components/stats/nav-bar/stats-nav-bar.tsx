import React from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
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
import { ShiftWorkerOptionT } from "../../../types/constraint";
import { ScheduleT } from "../../../types/schedule";

export default function StatsNavBar({
  lng,
  scheduleCampaign,
  statsOptions,
  statsUnitOptions,
  shiftOptions,
  handleUpdateStatsOptions,
}: {
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
}) {
  const { t } = useTranslation(lng, "stats-page");

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

  const handleSwitchShowFavorites = () => {
    const newStatsOptions = {
      ...statsOptions,
      showFavorites: !statsOptions.showFavorites,
    };
    handleUpdateStatsOptions(newStatsOptions);
  };

  return (
    <div className="stats-nav-bar-container">
      <div className="stats-time-options-container">
        <div className="stats-time-toggle">
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
                  height: "35px",
                  fontSize: "0.875rem",
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
        </div>
        <div className="stats-time-picker">
          <DatePicker
            value={statsOptions.startDate}
            disabled={statsOptions.timeFrame !== StatsTimeFrameOptions.CUSTOM}
            onChange={handleChangeStartDate}
            sx={{
              width: "135px",
              marginRight: "5px",
              "& .MuiOutlinedInput-input": {
                fontSize: "0.875rem",
                height: "35px",
                paddingY: 0,
              },
            }}
          />
          <DatePicker
            value={statsOptions.endDate}
            disabled={statsOptions.timeFrame !== StatsTimeFrameOptions.CUSTOM}
            onChange={handleChangeEndDate}
            sx={{
              width: "135px",
              "& .MuiOutlinedInput-input": {
                fontSize: "0.875rem",
                height: "35px",
                paddingY: 0,
              },
            }}
          />
        </div>
      </div>
      <div className="stats-options-container">
        <div className="stats-unit-select-container">
          <FormControl>
            <InputLabel id="stats-unit-select-label">{t("stats")}</InputLabel>
            <Select
              labelId="stats-unit-select-label"
              label={t("stats")}
              id="demo-simple-select"
              value={statsOptions.statsUnit}
              onChange={handleChangeStatsUnit}
              sx={{
                height: "35px",
                fontSize: "0.9rem",
                width: "160px",
                paddingY: 0,
              }}
              disabled={statsOptions.showFavorites}
            >
              {statsUnitOptions.map((option, index) => (
                <MenuItem key={index} value={option.name}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className="header-unit-select-container">
          <FormControl>
            <InputLabel id="header-unit-select-label">
              {t("view_by")}
            </InputLabel>
            <Select
              labelId="header-unit-select-label"
              label={t("view_by")}
              id="demo-simple-select"
              value={statsOptions.headerUnit}
              onChange={handleChangeHeaderUnit}
              sx={{
                height: "35px",
                fontSize: "0.9rem",
                width: "160px",
                paddingY: 0,
              }}
              disabled={statsOptions.showFavorites}
            >
              {headerUnitOptions.map((option, index) => (
                <MenuItem key={index} value={option.name}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className="shift-options-display-container">
          <ShiftOptionsDisplay
            lng={lng}
            selectedShifts={statsOptions.selectedShifts}
            statsShiftOptions={shiftOptions}
            disabled={statsOptions.showFavorites}
            handleEditSelectedShifts={handleEditSelectedShifts}
          />
        </div>
      </div>
      <IconButton
        onClick={handleSwitchShowFavorites}
        sx={{
          borderRadius: "50%",
          backgroundColor: statsOptions.showFavorites
            ? "rgba(255, 0, 0, 0.1)"
            : "transparent",
          "&:hover": {
            backgroundColor: statsOptions.showFavorites
              ? "rgba(255, 0, 0, 0.2)"
              : "rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        {statsOptions.showFavorites ? <FavoriteIcon /> : <FavoriteBorderIcon />}
      </IconButton>
    </div>
  );
}
