import React, { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
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
}: // statsShiftOptions,
// statsUnitOptions,
// setShowingCustom,
// handleGetStats,
{
  lng: string;
  scheduleCampaign: ScheduleT | null;
  // statsShiftOptions: ShiftWorkerOptionT[];
  // statsUnitOptions: Record<string, string>[];
  // setShowingCustom: (showingCustom: boolean) => void;
  // handleGetStats: (statsOptions: StatsOptionsT) => void;
}) {
  const { t } = useTranslation(lng, "stats-page");

  const [showFavorites, setShowFavorites] = useState<boolean>(false);

  const startDateLTM = dayjs.utc().startOf("day").subtract(1, "year");
  const endDateLTM = dayjs.utc().startOf("day");

  const [statsOptions, setStatsOptions] = useState<StatsOptionsT>({
    timeFrame: scheduleCampaign
      ? StatsTimeFrameOptions.CAMPAING
      : StatsTimeFrameOptions.LTM,
    startDate: scheduleCampaign ? scheduleCampaign.startDate : startDateLTM,
    endDate: scheduleCampaign ? scheduleCampaign.endDate : endDateLTM,
    statsUnit: StatsUnitOptions.FAVORITES,
    headerUnit: HeaderUnitOptions.WEEKDAY,
    selectedShifts: [
      {
        name: "all shifts",
        id: "",
        idType: SWOIdTypes.NONE,
        isBoolDim: false,
        categoryName: "All",
      },
    ],
  });

  const timeFrameOptions: { name: StatsTimeFrameOptions; label: string }[] = [
    { name: StatsTimeFrameOptions.CAMPAING, label: t("campaign") },
    { name: StatsTimeFrameOptions.LTM, label: t("time_frame_ltm") },
    { name: StatsTimeFrameOptions.CUSTOM, label: t("time_frame_custom") },
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
      setStatsOptions((prevState) => ({
        ...prevState,
        timeFrame: value,
        startDate: newStartDate,
        endDate: newEndDate,
      }));
    }
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
          <DatePicker
            value={statsOptions.endDate}
            disabled={statsOptions.timeFrame !== StatsTimeFrameOptions.CUSTOM}
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
    </div>
  );
}
