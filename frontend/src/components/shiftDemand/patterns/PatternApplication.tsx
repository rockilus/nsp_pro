/**
 * Pattern Application component
 * Allows users to apply predefined patterns to shift demands
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Divider,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  PlayArrow as ApplyIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { DemandPattern, CellSelection } from "@/types/shiftDemand";
import { DateUtils } from "@/app/lib/utils/shiftDemandUtils";

const PatternContainer = styled(Box)(({ theme }) => ({
  minHeight: "400px",
  display: "flex",
  flexDirection: "column",
}));

const PatternList = styled(List)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  maxHeight: "300px",
}));

const PatternPreview = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  marginTop: theme.spacing(2),
}));

const DayCell = styled(Box)<{ value: number }>(({ theme, value }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  borderRadius: "4px",
  backgroundColor:
    value > 0 ? theme.palette.primary.light : theme.palette.grey[100],
  color:
    value > 0
      ? theme.palette.primary.contrastText
      : theme.palette.text.secondary,
  fontWeight: value > 0 ? "bold" : "normal",
  border: `1px solid ${theme.palette.divider}`,
}));

interface PatternApplicationProps {
  open: boolean;
  onClose: () => void;
  patterns: DemandPattern[];
  selectedCells: CellSelection[];
  onApplyPattern: (
    pattern: DemandPattern,
    options: PatternApplicationOptions
  ) => void;
  onCreatePattern?: (
    pattern: Omit<DemandPattern, "name"> & { name: string }
  ) => void;
  onUpdatePattern?: (pattern: DemandPattern) => void;
  onDeletePattern?: (patternName: string) => void;
}

interface PatternApplicationOptions {
  mode: "replace" | "add" | "multiply";
  applyToWeekends: boolean;
  startDate?: Date;
  repeatWeeks?: number;
}

export const PatternApplication: React.FC<PatternApplicationProps> = ({
  open,
  onClose,
  patterns,
  selectedCells,
  onApplyPattern,
  onCreatePattern,
  onUpdatePattern,
  onDeletePattern,
}) => {
  const [selectedPattern, setSelectedPattern] = useState<DemandPattern | null>(
    null
  );
  const [tabValue, setTabValue] = useState(0);
  const [applicationOptions, setApplicationOptions] =
    useState<PatternApplicationOptions>({
      mode: "replace",
      applyToWeekends: true,
      repeatWeeks: 1,
    });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPattern, setNewPattern] = useState<Partial<DemandPattern>>({
    name: "",
    description: "",
    pattern: [0, 0, 0, 0, 0, 0, 0], // Monday to Sunday
    category: "custom",
  });

  // Predefined patterns
  const predefinedPatterns: DemandPattern[] = useMemo(
    () => [
      {
        name: "Weekdays Only",
        description: "Standard demand for Monday through Friday",
        pattern: [1, 1, 1, 1, 1, 0, 0],
        category: "weekday",
      },
      {
        name: "Weekends Only",
        description: "Weekend-only coverage",
        pattern: [0, 0, 0, 0, 0, 1, 1],
        category: "weekend",
      },
      {
        name: "Full Week",
        description: "Equal demand all week",
        pattern: [1, 1, 1, 1, 1, 1, 1],
        category: "custom",
      },
      {
        name: "Heavy Start",
        description: "Higher demand at week start",
        pattern: [3, 2, 2, 1, 1, 1, 1],
        category: "custom",
      },
      {
        name: "Mid-Week Peak",
        description: "Peak demand Wednesday-Thursday",
        pattern: [1, 2, 3, 3, 2, 1, 1],
        category: "custom",
      },
      {
        name: "Holiday Reduced",
        description: "Reduced holiday schedule",
        pattern: [0, 1, 1, 1, 1, 0, 0],
        category: "holiday",
      },
    ],
    []
  );

  // Combine predefined and custom patterns
  const allPatterns = useMemo(
    () => [...predefinedPatterns, ...patterns],
    [predefinedPatterns, patterns]
  );

  // Filter patterns by category
  const filteredPatterns = useMemo(() => {
    switch (tabValue) {
      case 0:
        return allPatterns;
      case 1:
        return allPatterns.filter((p) => p.category === "weekday");
      case 2:
        return allPatterns.filter((p) => p.category === "weekend");
      case 3:
        return allPatterns.filter((p) => p.category === "holiday");
      case 4:
        return allPatterns.filter((p) => p.category === "custom");
      default:
        return allPatterns;
    }
  }, [allPatterns, tabValue]);

  const handlePatternSelect = useCallback((pattern: DemandPattern) => {
    setSelectedPattern(pattern);
  }, []);

  const handleApplyPattern = useCallback(() => {
    if (selectedPattern) {
      onApplyPattern(selectedPattern, applicationOptions);
      onClose();
    }
  }, [selectedPattern, applicationOptions, onApplyPattern, onClose]);

  const handleCreatePattern = useCallback(() => {
    if (newPattern.name && newPattern.pattern && onCreatePattern) {
      onCreatePattern(newPattern as DemandPattern);
      setNewPattern({
        name: "",
        description: "",
        pattern: [0, 0, 0, 0, 0, 0, 0],
        category: "custom",
      });
      setShowCreateForm(false);
    }
  }, [newPattern, onCreatePattern]);

  const updatePatternValue = useCallback((dayIndex: number, value: number) => {
    setNewPattern((prev) => ({
      ...prev,
      pattern:
        prev.pattern?.map((v, i) =>
          i === dayIndex ? Math.max(0, value) : v
        ) || [],
    }));
  }, []);

  const renderPatternVisual = (pattern: number[]) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
      <Box display="flex" gap={1} alignItems="center">
        {pattern.map((value, index) => (
          <Box key={index} textAlign="center">
            <Typography variant="caption" display="block">
              {days[index]}
            </Typography>
            <DayCell value={value}>{value > 0 ? value : ""}</DayCell>
          </Box>
        ))}
      </Box>
    );
  };

  const renderPatternEditor = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Weekly Pattern
        </Typography>
        <Box display="flex" gap={1} alignItems="center" mb={2}>
          {days.map((day, index) => (
            <Box key={index} textAlign="center">
              <Typography variant="caption" display="block">
                {day}
              </Typography>
              <TextField
                size="small"
                value={newPattern.pattern?.[index] || 0}
                onChange={(e) =>
                  updatePatternValue(index, parseInt(e.target.value, 10) || 0)
                }
                type="number"
                inputProps={{ min: 0, max: 10 }}
                sx={{ width: "50px" }}
              />
            </Box>
          ))}
        </Box>
        {newPattern.pattern && renderPatternVisual(newPattern.pattern)}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: "80vh" },
      }}
    >
      <DialogTitle>Apply Demand Pattern</DialogTitle>

      <DialogContent>
        <PatternContainer>
          <Alert severity="info" sx={{ mb: 2 }}>
            {selectedCells.length} cells selected. Choose a pattern to apply.
          </Alert>

          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ mb: 2 }}
          >
            <Tab label="All" />
            <Tab label="Weekday" />
            <Tab label="Weekend" />
            <Tab label="Holiday" />
            <Tab label="Custom" />
          </Tabs>

          {/* Pattern List */}
          <PatternList>
            {filteredPatterns.map((pattern) => (
              <ListItem
                key={pattern.name}
                button
                selected={selectedPattern?.name === pattern.name}
                onClick={() => handlePatternSelect(pattern)}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {pattern.name}
                      </Typography>
                      <Chip
                        label={pattern.category}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {pattern.description}
                      </Typography>
                      <Box mt={1}>{renderPatternVisual(pattern.pattern)}</Box>
                    </Box>
                  }
                />
                {onDeletePattern && pattern.category === "custom" && (
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePattern(pattern.name);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </PatternList>

          {/* Create Pattern Form */}
          {showCreateForm && onCreatePattern && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Create New Pattern
              </Typography>

              <Box display="flex" gap={2} mb={2}>
                <TextField
                  label="Pattern Name"
                  value={newPattern.name}
                  onChange={(e) =>
                    setNewPattern((prev) => ({ ...prev, name: e.target.value }))
                  }
                  size="small"
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newPattern.category}
                    onChange={(e) =>
                      setNewPattern((prev) => ({
                        ...prev,
                        category: e.target.value as DemandPattern["category"],
                      }))
                    }
                    label="Category"
                  >
                    <MenuItem value="weekday">Weekday</MenuItem>
                    <MenuItem value="weekend">Weekend</MenuItem>
                    <MenuItem value="holiday">Holiday</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="Description"
                value={newPattern.description}
                onChange={(e) =>
                  setNewPattern((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                size="small"
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />

              {renderPatternEditor()}

              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="contained"
                  onClick={handleCreatePattern}
                  disabled={!newPattern.name || !newPattern.pattern}
                >
                  Create
                </Button>
                <Button onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </Box>
            </Paper>
          )}

          {/* Application Options */}
          {selectedPattern && (
            <PatternPreview>
              <Typography variant="subtitle2" gutterBottom>
                Application Options
              </Typography>

              <Box display="flex" gap={2} mb={2}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Mode</InputLabel>
                  <Select
                    value={applicationOptions.mode}
                    onChange={(e) =>
                      setApplicationOptions((prev) => ({
                        ...prev,
                        mode: e.target
                          .value as PatternApplicationOptions["mode"],
                      }))
                    }
                    label="Mode"
                  >
                    <MenuItem value="replace">Replace Values</MenuItem>
                    <MenuItem value="add">Add to Existing</MenuItem>
                    <MenuItem value="multiply">Multiply Existing</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Repeat Weeks"
                  type="number"
                  size="small"
                  value={applicationOptions.repeatWeeks}
                  onChange={(e) =>
                    setApplicationOptions((prev) => ({
                      ...prev,
                      repeatWeeks: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  inputProps={{ min: 1, max: 52 }}
                  sx={{ width: "120px" }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Selected pattern: <strong>{selectedPattern.name}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Will affect {selectedCells.length} selected cells
              </Typography>
            </PatternPreview>
          )}
        </PatternContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        {onCreatePattern && (
          <Button
            onClick={() => setShowCreateForm(true)}
            disabled={showCreateForm}
          >
            Create Pattern
          </Button>
        )}

        <Button
          variant="contained"
          onClick={handleApplyPattern}
          disabled={!selectedPattern}
          startIcon={<ApplyIcon />}
        >
          Apply Pattern
        </Button>
      </DialogActions>
    </Dialog>
  );
};
