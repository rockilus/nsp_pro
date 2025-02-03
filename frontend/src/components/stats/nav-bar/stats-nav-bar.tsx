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
import { StatsOptionsT } from "../../../types/stats";
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
    timeFrame: scheduleCampaign ? "campaign" : "last_12_months",
    startDate: scheduleCampaign ? scheduleCampaign.startDate : startDateLTM,
    endDate: scheduleCampaign ? scheduleCampaign.endDate : endDateLTM,
    statsUnit: "custom",
    headerUnit: "weekday",
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

  const timeFrameOptions: Record<string, string>[] = [
    { name: "campaign", label: t("campaign") },
    { name: "last_12_months", label: t("time_frame_ltm") },
    { name: "custom", label: t("time_frame_custom") },
  ];

  const handleChangeStatsTimeFrame = (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    value: string
  ) => {
    if (value && value !== statsOptions.timeFrame) {
      const newStartDate =
        value === "campaign"
          ? scheduleCampaign
            ? scheduleCampaign.startDate
            : startDateLTM
          : value === "last_12_months"
          ? startDateLTM
          : statsOptions.startDate;
      const newEndDate =
        value === "campaign"
          ? scheduleCampaign
            ? scheduleCampaign.endDate
            : endDateLTM
          : value === "last_12_months"
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
            >
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <div>
          <DatePicker
            value={statsOptions.startDate}
            disabled={statsOptions.timeFrame !== "custom"}
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
            disabled={statsOptions.timeFrame !== "custom"}
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
