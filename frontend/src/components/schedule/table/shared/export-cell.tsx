import React, { useState, Dispatch, SetStateAction } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import IosShareIcon from "@mui/icons-material/IosShare";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
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
  ScheduleStatus,
  periodDateT,
} from "../../../../types/schedule";

dayjs.extend(utc);

const ExportDialogContent = ({
  t,
  exportOptionsState,
  setExportOptionsState,
  ExportOptionsMap,
  periodDates,
  scheduleCampaign,
  handleConfirmExport,
  handleClose,
}: {
  t: (key: string) => string;
  exportOptionsState: ExportOptionsT;
  setExportOptionsState: Dispatch<SetStateAction<ExportOptionsT>>;
  ExportOptionsMap: { value: number; label: string }[];
  periodDates: periodDateT[];
  scheduleCampaign: ScheduleT | null;
  handleConfirmExport: () => void;
  handleClose: () => void;
}) => {
  return (
    <div className="popover-content-container">
      <div className="dialog-header">
        <span className="title">{t("export_to_excel")}</span>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          className="close-button"
          sx={{ marginBottom: "16px" }}
        >
          <CloseIcon className="close-icon" />
        </IconButton>
      </div>
      <div className="period-selector">
        <span className="period-selector-label">{t("period")}:</span>
        <ToggleButtonGroup
          color="primary"
          value={exportOptionsState.periodOption}
          exclusive
          onChange={(
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
                  startDate: periodDates[0].date,
                  endDate: periodDates[periodDates.length - 1].date,
                }));
              } else if (
                newAlignment === ExportPeriodOptions.CAMPAIGN &&
                scheduleCampaign
              ) {
                setExportOptionsState((prevState) => ({
                  ...prevState,
                  startDate: dayjs.utc(scheduleCampaign.startDate),
                  endDate: dayjs.utc(scheduleCampaign.endDate),
                }));
              }
            }
          }}
          aria-label="Platform"
        >
          {ExportOptionsMap.map((c) => (
            <ToggleButton
              key={c.value}
              disabled={
                c.value === ExportPeriodOptions.CAMPAIGN && !scheduleCampaign
              }
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
        <Button
          // className="export-to-excel-button"
          onClick={handleConfirmExport}
          variant="contained"
          sx={{ textTransform: "none" }}
        >
          {t("export_to_excel")}
        </Button>
      </div>
    </div>
  );
};

export default function ExportCell({
  lng,
  periodDates,
  scheduleCampaign,
  handleExportSchedule,
}: {
  lng: string;
  periodDates: periodDateT[];
  scheduleCampaign: ScheduleT | null;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [open, setOpen] = useState(false);
  const [exportOptionsState, setExportOptionsState] = useState<ExportOptionsT>(
    scheduleCampaign
      ? {
          periodOption: ExportPeriodOptions.CAMPAIGN,
          startDate: scheduleCampaign.startDate,
          endDate: scheduleCampaign.endDate,
        }
      : {
          periodOption: ExportPeriodOptions.CURRENT_SELECTION,
          startDate: periodDates[0].date,
          endDate: periodDates[periodDates.length - 1].date,
        }
  );

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
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
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
          startDate: periodDates[0].date,
          endDate: periodDates[periodDates.length - 1].date,
        }));
      } else if (
        newAlignment === ExportPeriodOptions.CAMPAIGN &&
        scheduleCampaign
      ) {
        setExportOptionsState((prevState) => ({
          ...prevState,
          startDate: dayjs.utc(scheduleCampaign.startDate),
          endDate: dayjs.utc(scheduleCampaign.endDate),
        }));
      }
    }
  };

  const handleConfirmExport = () => {
    handleExportSchedule(exportOptionsState);
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
        <Dialog
          open={open}
          onClose={handleClose}
          PaperProps={{
            style: {
              boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)",
              padding: 20,
              width: 500,
            },
          }}
        >
          <DialogContent>
            <ExportDialogContent
              t={t}
              exportOptionsState={exportOptionsState}
              setExportOptionsState={setExportOptionsState}
              ExportOptionsMap={ExportOptionsMap}
              periodDates={periodDates}
              scheduleCampaign={scheduleCampaign}
              handleConfirmExport={handleConfirmExport}
              handleClose={handleClose}
            />
          </DialogContent>
        </Dialog>
      </div>
    </TableCell>
  );
}
