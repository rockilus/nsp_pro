"use client";

import React from "react";
import {
  Box,
  TextField,
  Select,
  MenuItem,
  IconButton,
  FormControl,
  InputLabel,
  Typography,
  Chip,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import {
  DemandEntryDTO,
  TEMPLATE_CONSTRAINTS,
} from "@/types/shift-demand-template";

const DAYS_OF_WEEK = [
  { value: 0, label: "Monday", short: "Mon" },
  { value: 1, label: "Tuesday", short: "Tue" },
  { value: 2, label: "Wednesday", short: "Wed" },
  { value: 3, label: "Thursday", short: "Thu" },
  { value: 4, label: "Friday", short: "Fri" },
  { value: 5, label: "Saturday", short: "Sat" },
  { value: 6, label: "Sunday", short: "Sun" },
];

interface Shift {
  id: string;
  name: string;
}

interface DemandEntryEditorProps {
  entry: DemandEntryDTO;
  shifts: Shift[];
  onChange: (entry: DemandEntryDTO) => void;
  onDelete: () => void;
  showDelete?: boolean;
}

export const DemandEntryEditor: React.FC<DemandEntryEditorProps> = ({
  entry,
  shifts,
  onChange,
  onDelete,
  showDelete = true,
}) => {
  const selectedShift = shifts.find((s) => s.id === entry.shiftId);
  const selectedDay = DAYS_OF_WEEK.find((d) => d.value === entry.dayOfWeek);

  const handleShiftChange = (shiftId: string) => {
    onChange({ ...entry, shiftId });
  };

  const handleDayChange = (dayOfWeek: number) => {
    onChange({ ...entry, dayOfWeek });
  };

  const handleCountChange = (count: number) => {
    const validCount = Math.max(
      0,
      Math.min(count, TEMPLATE_CONSTRAINTS.MAX_COUNT_PER_DEMAND)
    );
    onChange({ ...entry, count: validCount });
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        mb: 1,
        bgcolor: "background.paper",
        "&:hover": {
          borderColor: "primary.main",
          bgcolor: "action.hover",
        },
      }}
    >
      <FormControl sx={{ minWidth: 180 }}>
        <InputLabel size="small">Shift</InputLabel>
        <Select
          size="small"
          value={entry.shiftId}
          label="Shift"
          onChange={(e) => handleShiftChange(e.target.value)}
        >
          {shifts.map((shift) => (
            <MenuItem key={shift.id} value={shift.id}>
              <Box>
                <Typography variant="body2">{shift.name}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 140 }}>
        <InputLabel size="small">Day</InputLabel>
        <Select
          size="small"
          value={entry.dayOfWeek}
          label="Day"
          onChange={(e) => handleDayChange(Number(e.target.value))}
        >
          {DAYS_OF_WEEK.map((day) => (
            <MenuItem key={day.value} value={day.value}>
              {day.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Count"
        type="number"
        size="small"
        value={entry.count}
        onChange={(e) => handleCountChange(Number(e.target.value))}
        inputProps={{
          min: 0,
          max: TEMPLATE_CONSTRAINTS.MAX_COUNT_PER_DEMAND,
          step: 1,
        }}
        sx={{ width: 100 }}
        helperText={`Max ${TEMPLATE_CONSTRAINTS.MAX_COUNT_PER_DEMAND}`}
      />

      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 120 }}
      >
        {selectedShift && (
          <Chip
            label={selectedShift.name}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
        {selectedDay && (
          <Chip
            label={selectedDay.short}
            size="small"
            color="secondary"
            variant="outlined"
          />
        )}
      </Box>

      {showDelete && (
        <IconButton
          onClick={onDelete}
          color="error"
          size="small"
          aria-label="Delete demand entry"
          sx={{ ml: "auto" }}
        >
          <DeleteIcon />
        </IconButton>
      )}
    </Box>
  );
};

interface DemandEntryListProps {
  demands: DemandEntryDTO[];
  shifts: Shift[];
  onChange: (demands: DemandEntryDTO[]) => void;
  title?: string;
}

export const DemandEntryList: React.FC<DemandEntryListProps> = ({
  demands,
  shifts,
  onChange,
  title = "Demand Entries",
}) => {
  const handleEntryChange = (index: number, entry: DemandEntryDTO) => {
    const newDemands = [...demands];
    newDemands[index] = entry;
    onChange(newDemands);
  };

  const handleEntryDelete = (index: number) => {
    const newDemands = demands.filter((_, i) => i !== index);
    onChange(newDemands);
  };

  const handleAddEntry = () => {
    const newEntry: DemandEntryDTO = {
      shiftId: shifts[0]?.id || "",
      dayOfWeek: 0, // Monday
      count: 1,
    };
    onChange([...demands, newEntry]);
  };

  const totalDemands = demands.reduce((sum, demand) => sum + demand.count, 0);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {title}
          {demands.length > 0 && (
            <Chip
              label={`${demands.length} entries, ${totalDemands} total`}
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
        <IconButton
          onClick={handleAddEntry}
          color="primary"
          disabled={shifts.length === 0}
        >
          <AddIcon />
        </IconButton>
      </Box>

      {shifts.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No shifts available. Please create shifts first before adding demand
          entries.
        </Typography>
      )}

      {demands.length === 0 && shifts.length > 0 && (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No demand entries yet. Click the + button to add your first entry.
        </Typography>
      )}

      {demands.map((entry, index) => (
        <DemandEntryEditor
          key={`${entry.shiftId}-${entry.dayOfWeek}-${index}`}
          entry={entry}
          shifts={shifts}
          onChange={(newEntry) => handleEntryChange(index, newEntry)}
          onDelete={() => handleEntryDelete(index)}
          showDelete={demands.length > 1}
        />
      ))}
    </Box>
  );
};
