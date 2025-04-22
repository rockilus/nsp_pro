import React, { useState, useMemo } from "react";
import {
  IconButton,
  Popover,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  FormControl,
  InputLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  ScheduleT,
  DuplicateRequestT,
  DuplicateOptionsT,
  PeriodT,
} from "../../../types/schedule";
import { OccurrenceType } from "@/types/recurrence";
import dayjs from "dayjs";

interface ScheduleSettingsProps {
  campaign: ScheduleT | null;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  handleSendDuplicateRequest: (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string
  ) => void;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
  campaign,
  startDate,
  endDate,
  handleSendDuplicateRequest,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isDuplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [isWarningDialogOpen, setWarningDialogOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState<{
    label: string;
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
  } | null>(null);
  const [occurrenceType, setOccurrenceType] = useState<OccurrenceType>(
    OccurrenceType.ASSIGNMENT
  );

  console.log("targetWeek", targetWeek);

  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const handleDuplicateWeek = () => {
    setDuplicateDialogOpen(true);
    handleClosePopover();
  };

  const handleConfirmDuplicate = () => {
    if (!targetWeek || !campaign) return;

    const duplicateRequest: DuplicateRequestT = {
      sourcePeriod: {
        startDate: startDate,
        endDate: endDate,
      },
      targetPeriod: {
        startDate: targetWeek.startDate,
        endDate: targetWeek.endDate,
      },
      options: {
        occurrenceType,
      },
    };

    handleSendDuplicateRequest(duplicateRequest, campaign.id, campaign.teamId);
    setWarningDialogOpen(false);
  };

  const handleCloseWarningDialog = () => {
    setTargetWeek(null);
    setWarningDialogOpen(false);
  };

  const weekOptions = useMemo(() => {
    if (!campaign) return [];

    const campaignStart = campaign.startDate.startOf("day");
    const campaignEnd = campaign.endDate.endOf("day");
    const test = campaignStart.endOf("week").add(1, "day");
    console.log("campaignStart", campaignStart.format("YYYY-MM-DD"));
    console.log("test", test.format("YYYY-MM-DD"));

    const weeks = [];
    let currentStart = campaignStart;

    while (currentStart.isSameOrBefore(campaignEnd)) {
      const currentEnd = dayjs.min(
        currentStart.endOf("week").add(1, "day"),
        campaignEnd
      );
      weeks.push({
        label: `${currentStart.format("D MMMM YYYY")} - ${currentEnd.format(
          "D MMMM YYYY"
        )}`,
        startDate: currentStart,
        endDate: currentEnd,
      });
      currentStart = currentEnd.add(1, "day");
    }

    return weeks;
  }, [campaign]);

  return (
    <div>
      <IconButton onClick={handleOpenPopover}>
        <SettingsIcon />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem onClick={handleDuplicateWeek} disabled={!campaign}>
          Duplicate Week
        </MenuItem>
      </Popover>

      <Dialog
        open={isDuplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
      >
        <DialogTitle>Select Target Week</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel>Target Week</InputLabel>
            <Select
              value={targetWeek?.label || ""}
              onChange={(e) => {
                const selectedWeek = weekOptions.find(
                  (week) => week.label === e.target.value
                );
                setTargetWeek(selectedWeek || null);
              }}
              style={{ minWidth: "300px" }}
            >
              {weekOptions.map((week, index) => (
                <MenuItem key={`${index}-${week.label}`} value={week.label}>
                  {week.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <RadioGroup
            value={occurrenceType}
            onChange={(e) => setOccurrenceType(Number(e.target.value))}
            style={{ marginTop: "16px" }}
          >
            <FormControlLabel
              value={OccurrenceType.ASSIGNMENT}
              control={<Radio size="small" />}
              label={<span style={{ fontSize: "0.875rem" }}>Assignment</span>}
            />
            <FormControlLabel
              value={OccurrenceType.DAILY_SHIFT_DEMAND}
              control={<Radio size="small" />}
              label={
                <span style={{ fontSize: "0.875rem" }}>Daily Shift Demand</span>
              }
              disabled={true}
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setTargetWeek(null);
              setDuplicateDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDuplicate}
            color="primary"
            variant="contained"
            disabled={!targetWeek}
          >
            Duplicate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isWarningDialogOpen} onClose={handleCloseWarningDialog}>
        <DialogTitle>Duplicate to week {targetWeek?.label}</DialogTitle>
        <DialogContent>
          Assignments in the target week will be deleted. Do you want to
          proceed?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseWarningDialog}>Cancel</Button>
          <Button
            onClick={handleCloseWarningDialog}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ScheduleSettings;
