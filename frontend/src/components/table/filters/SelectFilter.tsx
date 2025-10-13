import React, { useState } from "react";
import {
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { ColumnFilter } from "../../../types/filter";

interface SelectFilterProps {
  onApply: (filter: ColumnFilter) => void;
  onClose: () => void;
  columnId: string;
  label: string;
  options: Array<{ value: any; label: string }>;
  currentValue?: any[];
}

export default function SelectFilter({
  onApply,
  onClose,
  columnId,
  label,
  options,
  currentValue,
}: SelectFilterProps) {
  const [selectedValues, setSelectedValues] = useState<any[]>(
    currentValue || []
  );

  const handleToggle = (value: any) => {
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleApply = () => {
    if (selectedValues.length > 0) {
      const selectedLabels = selectedValues.map(
        (val) => options.find((opt) => opt.value === val)?.label || val
      );
      onApply({
        id: columnId,
        type: "select",
        value: selectedValues,
        label: `${label} is ${selectedLabels.join(", ")}`,
      });
    }
    onClose();
  };

  return (
    <Box
      sx={{ p: 2, minWidth: 250, maxHeight: 300, overflow: "auto" }}
      data-testid={`select-filter-${columnId}`}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Filter {label}
      </Typography>
      <FormControl component="fieldset">
        <FormGroup>
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              control={
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onChange={() => handleToggle(option.value)}
                  size="small"
                  data-testid={`filter-option-${columnId}-${option.value}`}
                />
              }
              label={option.label}
            />
          ))}
        </FormGroup>
      </FormControl>
      <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
        <Button
          onClick={handleApply}
          variant="contained"
          size="small"
          data-testid={`filter-apply-${columnId}`}
        >
          Apply
        </Button>
        <Button
          onClick={onClose}
          size="small"
          data-testid={`filter-cancel-${columnId}`}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
