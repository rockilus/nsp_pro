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
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import ShiftOptionsDisplay from "./shift-options-display";
// Styles
import "../../../styles/text-styles.css";
import "./stats-options.css";
// Types
import { StatsOptionsT } from "../../../types/stats";
import { ShiftWorkerOptionT } from "../../../types/constraint";

dayjs.extend(utc);

export default function StatsOptions({
  lng,
  statsShiftOptions,
  statsUnitOptions,
  setShowingCustom,
  handleGetStats,
}: {
  lng: string;
  statsShiftOptions: ShiftWorkerOptionT[];
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
    selectedShifts: [
      {
        name: "all shifts",
        id: "",
        idType: "",
        isBoolDim: false,
        categoryName: "All",
      },
    ],
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
    { name: "campaign", label: t("campaign") },
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
    newSelectedShifts: ShiftWorkerOptionT[]
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
    <div className="stats-options-container">
      <span className="title">{t("stats")}</span>
      <div className="stats-options">
        <div className="stats-options-row">
          <div className="row-label-container">
            <span className="row-label">{t("time_frame")}</span>
          </div>
          <div className="row-value-container">
            {
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
          </div>
        </div>
        {statsOptions.timeFrame === "custom" && (
          <div>
            <div className="stats-options-row">
              <div className="row-label-container">
                <span className="row-label-2">{t("start")}</span>
              </div>
              <div className="row-value-container">
                {
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
              </div>
            </div>
            <div className="stats-options-row">
              <div className="row-label-container">
                <span className="row-label-2">{t("end")}</span>
              </div>
              <div className="row-value-container">
                {
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
              </div>
            </div>
          </div>
        )}
        <div className="stats-options-row">
          <div className="row-label-container">
            <span className="row-label">{t("stats")}</span>
          </div>
          <div className="row-value-container">
            {
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
          </div>
        </div>
        {statsUnitWithFrequency.includes(statsOptions.statsUnit) && (
          <div className="stats-options-row">
            <div className="row-label-container">
              <span className="row-label-2">{t("view_by")}</span>
            </div>
            <div className="row-value-container">
              {
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
            </div>
          </div>
        )}
        {statsOptions.statsUnit !== "custom" && (
          <div className="stats-options-row">
            <div className="row-label-container">
              <span className="row-label">{t("shifts")}</span>
            </div>
            <div className="row-value-container">
              {
                <ShiftOptionsDisplay
                  lng={lng}
                  selectedShifts={statsOptions.selectedShifts}
                  statsShiftOptions={statsShiftOptions}
                  handleEditSelectedShifts={handleEditSelectedShifts}
                />
              }
            </div>
          </div>
        )}
      </div>
      <div className="get-stats-button-container">
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              width: "80%",
              borderRadius: "4px",
              backgroundColor: "#1976d2",
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
              width: "80%",
              height: "100%",
            }}
          >
            {t("get_stats")}
          </Button>
        )}
      </div>
    </div>
  );
}
