import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import IosShareIcon from "@mui/icons-material/IosShare";
import Popover from "@mui/material/Popover";
import TableCell from "@mui/material/TableCell";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Styles
import "./export-cell.css";
import "../../../../styles/text-styles.css";
// Types
import {
  ExportOptionsT,
  ExportPeriodOptions,
  ScheduleT,
} from "../../../../types/schedule";

dayjs.extend(utc);

export default function ExportCell({
  lng,
  dates,
  schedule,
  handleExportSchedule,
}: {
  lng: string;
  dates: dayjs.Dayjs[];
  schedule: ScheduleT;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [exportOptionsState, setExportOptionsState] = useState<ExportOptionsT>({
    periodOption: ExportPeriodOptions.CAMPAIGN,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
  });

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const ExportOptionsMap: { value: number; label: string }[] = [
    {
      value: ExportPeriodOptions.CURRENT_SELECTION,
      label: t("current_selection"),
    },
    { value: ExportPeriodOptions.CAMPAIGN, label: t("campaign") },
    { value: ExportPeriodOptions.ALL, label: t("all") },
    { value: ExportPeriodOptions.CUSTOM, label: t("custom") },
  ];

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: number
  ) => {
    if (newAlignment !== null) {
      setExportOptionsState((prevState) => ({
        ...prevState,
        periodOption: newAlignment,
      }));
      if (newAlignment === ExportPeriodOptions.CURRENT_SELECTION) {
        setExportOptionsState((prevState) => ({
          ...prevState,
          startDate: dates[0],
          endDate: dates[dates.length - 1],
        }));
      } else if (newAlignment === ExportPeriodOptions.CAMPAIGN) {
        setExportOptionsState((prevState) => ({
          ...prevState,
          startDate: dayjs.utc(schedule.startDate),
          endDate: dayjs.utc(schedule.endDate),
        }));
      }
    }
  };

  const handleConfirmExport = () => {
    handleExportSchedule(exportOptionsState);
  };

  const PopoverContent = () => {
    return (
      <div className="popover-content-container">
        <span className="subtitle">{t("export_to_excel")}</span>
        <div className="period-selector">
          <span className="period-selector-label">{t("period")}:</span>
          <ToggleButtonGroup
            color="primary"
            value={exportOptionsState.periodOption}
            exclusive
            onChange={handleChange}
            aria-label="Platform"
          >
            {ExportOptionsMap.map((c) => (
              <ToggleButton
                key={c.value}
                value={c.value}
                sx={{
                  textTransform: "none",
                  height: "25px",
                  fontSize: "0.8rem",
                }}
              >
                {c.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
        <div className="date-picker-container">
          <DatePicker
            disabled={
              exportOptionsState.periodOption !== ExportPeriodOptions.CUSTOM
            }
            value={exportOptionsState.startDate}
            onChange={(newValue) => {
              setExportOptionsState((prevState) => ({
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
                height: "35px",
                paddingY: 0,
              },
            }}
          />
          <DatePicker
            disabled={
              exportOptionsState.periodOption !== ExportPeriodOptions.CUSTOM
            }
            value={exportOptionsState.endDate}
            onChange={(newValue) => {
              setExportOptionsState((prevState) => ({
                ...prevState,
                endDate: newValue
                  ? dayjs.utc(newValue).startOf("day")
                  : dayjs.utc().startOf("day"),
              }));
            }}
            sx={{
              width: "160px",
              marginLeft: "10px",
              "& .MuiOutlinedInput-input": {
                fontSize: "0.875rem",
                height: "35px",
                paddingY: 0,
              },
            }}
          />
        </div>
        <div className="confirm-export-button-container">
          <button
            className="export-to-excel-button"
            onClick={handleConfirmExport}
          >
            {t("export_to_excel")}
          </button>
        </div>
      </div>
    );
  };

  return (
    <TableCell
      sx={{
        position: "sticky",
        left: 0,
        backgroundColor: "#FFFFFF",
        padding: 0,
      }}
    >
      <div className="export-cell-container">
        <button className="export-button" onClick={handleClick}>
          <IosShareIcon sx={{ color: "#616161cf" }} />
        </button>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              style: {
                boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)",
                padding: 20,
                width: 450,
              },
            },
          }}
        >
          <PopoverContent />
        </Popover>
      </div>
    </TableCell>
  );
}
