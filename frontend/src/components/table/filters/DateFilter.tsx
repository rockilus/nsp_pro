import React, { useState } from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import { ColumnFilter } from "../../../types/filter";

interface DateFilterProps {
  onApply: (filter: ColumnFilter) => void;
  onClose: () => void;
  columnId: string;
  label: string;
  currentValue?: { start: string; end: string };
}

export default function DateFilter({
  onApply,
  onClose,
  columnId,
  label,
  currentValue,
}: DateFilterProps) {
  const [startDate, setStartDate] = useState(currentValue?.start || "");
  const [endDate, setEndDate] = useState(currentValue?.end || "");

  const handleApply = () => {
    if (startDate || endDate) {
      onApply({
        id: columnId,
        type: "date",
        value: { start: startDate, end: endDate },
        label: `${label} between ${startDate} and ${endDate}`,
      });
    }
    onClose();
  };

  return (
    <Box sx={{ p: 2, minWidth: 300 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Filter {label}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          type="date"
          size="small"
          label="Start Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          size="small"
          label="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>
      <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
        <Button onClick={handleApply} variant="contained" size="small">
          Apply
        </Button>
        <Button onClick={onClose} size="small">
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
