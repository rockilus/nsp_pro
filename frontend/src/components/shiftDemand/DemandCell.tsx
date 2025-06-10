/**
 * Individual cell component for shift demand grid
 * Provides inline editing with validation and visual feedback
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, TextField, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { ValidationUtils } from "@/app/lib/utils/shiftDemandUtils";

const CellContainer = styled(Box)<{
  isSelected?: boolean;
  isWeekend?: boolean;
  isToday?: boolean;
  hasError?: boolean;
  hasWarning?: boolean;
  compact?: boolean;
}>(
  ({
    theme,
    isSelected,
    isWeekend,
    isToday,
    hasError,
    hasWarning,
    compact,
  }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: compact ? 32 : 40,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: isSelected
      ? theme.palette.primary.light
      : isToday
      ? theme.palette.action.hover
      : isWeekend
      ? theme.palette.grey[50]
      : theme.palette.background.paper,
    cursor: "pointer",
    position: "relative",
    transition: theme.transitions.create(["background-color", "border-color"], {
      duration: theme.transitions.duration.shortest,
    }),

    "&:hover": {
      backgroundColor: isSelected
        ? theme.palette.primary.light
        : theme.palette.action.hover,
      borderColor: theme.palette.primary.main,
    },

    ...(hasError && {
      borderColor: theme.palette.error.main,
      backgroundColor: theme.palette.error.light,
    }),

    ...(hasWarning && {
      borderColor: theme.palette.warning.main,
      backgroundColor: theme.palette.warning.light,
    }),
  })
);

const CellInput = styled(TextField)(({ theme }) => ({
  "& .MuiInputBase-root": {
    fontSize: "0.875rem",
    padding: 0,
    minHeight: "unset",
    "& input": {
      textAlign: "center",
      padding: theme.spacing(0.5),
      border: "none",
      background: "transparent",
      "&:focus": {
        background: theme.palette.background.paper,
      },
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "none",
  },
}));

const CellValue = styled(Box)<{ compact?: boolean }>(({ theme, compact }) => ({
  fontSize: compact ? "0.75rem" : "0.875rem",
  fontWeight: 500,
  color: theme.palette.text.primary,
  userSelect: "none",
  padding: theme.spacing(0.5),
  width: "100%",
  textAlign: "center",
}));

interface DemandCellProps {
  shiftId: string;
  date: string;
  value: number;
  onChange: (shiftId: string, date: string, value: number) => void;
  onSelect?: (shiftId: string, date: string, selected: boolean) => void;
  readonly?: boolean;
  isSelected?: boolean;
  isWeekend?: boolean;
  isToday?: boolean;
  showEmpty?: boolean;
  compact?: boolean;
  validation?: {
    min?: number;
    max?: number;
    warning?: string;
  };
}

export const DemandCell: React.FC<DemandCellProps> = ({
  shiftId,
  date,
  value,
  onChange,
  onSelect,
  readonly = false,
  isSelected = false,
  isWeekend = false,
  isToday = false,
  showEmpty = true,
  compact = false,
  validation,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [validationResult, setValidationResult] = useState(
    ValidationUtils.validateDemandCount(value)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value.toString());
      setValidationResult(ValidationUtils.validateDemandCount(value));
    }
  }, [value, isEditing]);

  // Handle cell click to start editing
  const handleCellClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      if (readonly) return;

      if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd
        onSelect?.(shiftId, date, !isSelected);
      } else if (event.shiftKey) {
        // Range select with Shift (would need additional logic)
        onSelect?.(shiftId, date, true);
      } else {
        // Start editing
        setIsEditing(true);
      }
    },
    [readonly, shiftId, date, isSelected, onSelect]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setEditValue(newValue);

      // Validate input
      const numValue = parseInt(newValue, 10);
      if (!isNaN(numValue)) {
        const result = ValidationUtils.validateDemandCount(numValue);
        setValidationResult(result);
      } else {
        setValidationResult({
          isValid: false,
          message: "Must be a number",
          severity: "error",
        });
      }
    },
    []
  );

  // Handle input submission
  const handleInputSubmit = useCallback(() => {
    const numValue = parseInt(editValue, 10);

    if (!isNaN(numValue) && validationResult.isValid) {
      onChange(shiftId, date, numValue);
    } else {
      // Reset to original value on invalid input
      setEditValue(value.toString());
    }

    setIsEditing(false);
  }, [editValue, validationResult.isValid, onChange, shiftId, date, value]);

  // Handle key events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "Enter":
          event.preventDefault();
          handleInputSubmit();
          break;
        case "Escape":
          event.preventDefault();
          setEditValue(value.toString());
          setIsEditing(false);
          break;
        case "Tab":
          // Allow tab to move to next cell
          handleInputSubmit();
          break;
      }
    },
    [handleInputSubmit, value]
  );

  // Handle input blur
  const handleInputBlur = useCallback(() => {
    handleInputSubmit();
  }, [handleInputSubmit]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Determine if cell should be displayed
  const shouldDisplay = showEmpty || value > 0;
  const displayValue = value > 0 ? value.toString() : "";

  // Determine cell styling based on validation
  const hasError =
    !validationResult.isValid && validationResult.severity === "error";
  const hasWarning = validationResult.severity === "warning";

  if (!shouldDisplay && !isEditing) {
    return (
      <CellContainer
        isSelected={isSelected}
        isWeekend={isWeekend}
        isToday={isToday}
        compact={compact}
        onClick={handleCellClick}
      />
    );
  }

  const cellContent = isEditing ? (
    <CellInput
      ref={inputRef}
      value={editValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onBlur={handleInputBlur}
      variant="outlined"
      size="small"
      type="number"
      inputProps={{
        min: 0,
        max: validation?.max || 99,
        step: 1,
      }}
      error={hasError}
      fullWidth
    />
  ) : (
    <CellValue compact={compact} onClick={handleCellClick}>
      {displayValue}
    </CellValue>
  );

  const cellComponent = (
    <CellContainer
      isSelected={isSelected}
      isWeekend={isWeekend}
      isToday={isToday}
      hasError={hasError}
      hasWarning={hasWarning}
      compact={compact}
    >
      {cellContent}
    </CellContainer>
  );

  // Wrap with tooltip if there's a validation message
  if (validationResult.message) {
    return (
      <Tooltip title={validationResult.message} placement="top" arrow>
        {cellComponent}
      </Tooltip>
    );
  }

  return cellComponent;
};
