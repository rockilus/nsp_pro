/**
 * Template Viewer Component - Display template details in read-only mode
 *
 * Shows:
 * - Template metadata (name, description, type, dates)
 * - Weekly demand grids for each week type
 * - Action buttons (edit, apply, delete)
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import {
  Edit,
  PlayArrow,
  Delete,
  CalendarToday,
  Person,
  Info,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT } from "../../../types/shift";
import {
  ShiftDemandTemplateDTO,
  TemplateWeekDataDTO,
  DemandEntryDTO,
  TemplateType,
  TEMPLATE_CONSTRAINTS,
} from "../../../types/shift-demand-template";
import {
  ShiftDemandTemplateApi,
  TemplateUtils,
} from "../../../app/lib/api/shiftDemandTemplateApi";
import { TemplateToolbar } from "./TemplateToolbar";
import { BuildFromDemandsDialog } from "./dialogs/BuildFromDemandsDialog";
import TemplateTable from "./TemplateTable";

interface TemplateViewerProps {
  lng: string;
  template: ShiftDemandTemplateDTO;
  shifts: ShiftT[];
  onApply: () => void;
  onDelete: () => void;
  onError: (error: string) => void;
}

export function TemplateViewer({
  lng,
  template,
  shifts,
  onApply,
  onDelete,
  onError,
}: TemplateViewerProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toolbar state
  const [currentWeek, setCurrentWeek] = useState(0);
  const [weeksToShow, setWeeksToShow] = useState<1 | 2 | "all">(1);
  const [templateType, setTemplateType] = useState<TemplateType>(
    template.templateType as TemplateType
  );
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);

  // Edit dialogs state
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editDescriptionOpen, setEditDescriptionOpen] = useState(false);
  const [editedName, setEditedName] = useState(template.name);
  const [editedDescription, setEditedDescription] = useState(
    template.description || ""
  );
  const [saveLoading, setSaveLoading] = useState(false);

  // Template table state
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [bulkChangeState, setBulkChangeState] = useState<{
    isActive: boolean;
    selectedCells: { shiftId: string; weekNumber: number; dayIndex: number }[];
    bulkValue: string;
  }>({
    isActive: false,
    selectedCells: [],
    bulkValue: "1",
  });

  // Get day names for headers
  const dayNames = [
    t("monday_short"),
    t("tuesday_short"),
    t("wednesday_short"),
    t("thursday_short"),
    t("friday_short"),
    t("saturday_short"),
    t("sunday_short"),
  ];

  // Create shifts map for quick lookup
  const shiftsMap = new Map(shifts.map((shift) => [shift.id, shift]));

  // Compute derived values for toolbar
  const totalWeeks = template.weeksData.length;
  const displayedWeeks = useMemo(() => {
    if (weeksToShow === "all") {
      return template.weeksData.map((w) => w.weekNumber);
    }
    if (weeksToShow === 2) {
      const secondWeek = Math.min(currentWeek + 1, totalWeeks - 1);
      return currentWeek === secondWeek
        ? [currentWeek]
        : [currentWeek, secondWeek];
    }
    return [currentWeek];
  }, [currentWeek, weeksToShow, template.weeksData, totalWeeks]);

  // Template data lookup maps
  const templateDataMap = useMemo(() => {
    const map = new Map<string, number>();
    template.weeksData.forEach((week) => {
      week.demands.forEach((demand) => {
        const key = `${demand.shiftId}-${week.weekNumber}-${demand.dayOfWeek}`;
        map.set(key, demand.count);
      });
    });
    return map;
  }, [template.weeksData]);

  const handleDelete = async () => {
    if (
      !window.confirm(t("confirm_delete_template", { name: template.name }))
    ) {
      return;
    }

    setDeleteLoading(true);
    try {
      await ShiftDemandTemplateApi.deleteTemplate(template.id, template.teamId);
      onDelete();
    } catch (error) {
      console.error("Failed to delete template:", error);
      onError(
        error instanceof Error ? error.message : "Failed to delete template"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditName = () => {
    setEditedName(template.name);
    setEditNameOpen(true);
  };

  const handleEditDescription = () => {
    setEditedDescription(template.description || "");
    setEditDescriptionOpen(true);
  };

  const handleSaveName = async () => {
    const trimmedName = editedName.trim();

    if (
      trimmedName === "" ||
      trimmedName.length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH
    ) {
      setEditNameOpen(false);
      return;
    }

    if (trimmedName === template.name) {
      setEditNameOpen(false);
      return;
    }

    setSaveLoading(true);
    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        {
          name: trimmedName,
        }
      );
      setEditNameOpen(false);
    } catch (error) {
      console.error("Failed to update template name:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Failed to update template name"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    if (editedDescription === template.description) {
      setEditDescriptionOpen(false);
      return;
    }

    setSaveLoading(true);
    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        {
          description: editedDescription.trim() || undefined,
        }
      );
      setEditDescriptionOpen(false);
    } catch (error) {
      console.error("Failed to update template description:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Failed to update template description"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const formatTemplateType = (type: TemplateType) => {
    return TemplateUtils.formatTemplateType(type);
  };

  const formatDate = (timestamp: number) => {
    return dayjs(timestamp * 1000).format("MMMM D, YYYY");
  };

  // Toolbar handlers
  const handleWeekChange = (week: number) => {
    setCurrentWeek(Math.max(0, Math.min(week, totalWeeks - 1)));
  };

  const handleWeeksToShowChange = (weeks: 1 | 2 | "all") => {
    setWeeksToShow(weeks);
    // Reset current week if it would go out of bounds
    if (weeks !== "all") {
      const maxStartWeek = totalWeeks - (weeks === 2 ? 2 : 1);
      if (currentWeek > Math.max(0, maxStartWeek)) {
        setCurrentWeek(Math.max(0, maxStartWeek));
      }
    }
  };

  const handleTemplateTypeChange = (type: TemplateType) => {
    setTemplateType(type);
  };

  const handleAddWeek = async () => {
    // Create new week data with empty demands
    const newWeekNumber = template.weeksData.length;
    const newWeekData: TemplateWeekDataDTO = {
      weekNumber: newWeekNumber,
      demands: [],
    };

    const updatedWeeksData = [...template.weeksData, newWeekData];

    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        { weeksData: updatedWeeksData }
      );
    } catch (error) {
      throw error; // Let the toolbar handle the error display
    }
  };

  const handleDeleteWeek = async (weekNumber: number) => {
    if (template.weeksData.length <= 1) {
      throw new Error("Cannot delete the last week");
    }

    // Remove the week and renumber remaining weeks
    const updatedWeeksData = template.weeksData
      .filter((week) => week.weekNumber !== weekNumber)
      .map((week, index) => ({
        ...week,
        weekNumber: index, // Renumber weeks to be consecutive
      }));

    try {
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        { weeksData: updatedWeeksData }
      );

      // Adjust current week if necessary
      const newTotalWeeks = updatedWeeksData.length;
      if (currentWeek >= newTotalWeeks) {
        setCurrentWeek(Math.max(0, newTotalWeeks - 1));
      }
    } catch (error) {
      throw error; // Let the toolbar handle the error display
    }
  };

  const handleBuildFromDemands = () => {
    setBuildDialogOpen(true);
  };

  // Render a week data grid
  const renderWeekGrid = (demands: DemandEntryDTO[], title: string) => {
    // Group demands by shift
    const demandsByShift = demands.reduce((acc, demand) => {
      if (!acc[demand.shiftId]) {
        acc[demand.shiftId] = new Array(7).fill(0);
      }
      acc[demand.shiftId][demand.dayOfWeek] = demand.count;
      return acc;
    }, {} as Record<string, number[]>);

    // Get unique shifts that have demands
    const shiftsWithDemands = Object.keys(demandsByShift)
      .map((shiftId) => shiftsMap.get(shiftId))
      .filter(Boolean) as ShiftT[];

    if (shiftsWithDemands.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("no_demands_for_week", { week: title })}
        </Alert>
      );
    }

    return (
      <Box className="template-week-grid">
        {/* Header row */}
        <Box className="template-week-grid-header">{t("shift")}</Box>
        {dayNames.map((dayName) => (
          <Box key={dayName} className="template-week-grid-header">
            {dayName}
          </Box>
        ))}

        {/* Data rows */}
        {shiftsWithDemands.map((shift) => {
          const shiftDemands = demandsByShift[shift.id];
          return (
            <React.Fragment key={shift.id}>
              <Box className="template-week-grid-cell">
                <Typography variant="body2" fontWeight={500}>
                  {shift.name}
                </Typography>
              </Box>
              {shiftDemands.map((count, dayIndex) => (
                <Box
                  key={dayIndex}
                  className={`template-week-grid-cell ${
                    count > 0 ? "has-demand" : "empty"
                  }`}
                >
                  {count > 0 ? count : "—"}
                </Box>
              ))}
            </React.Fragment>
          );
        })}
      </Box>
    );
  };

  const getDemandValue = (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ): number => {
    const key = `${shiftId}-${weekNumber}-${dayIndex}`;
    return templateDataMap.get(key) || 0;
  };

  const handleCellChange = async (
    shiftId: string,
    weekNumber: number,
    dayIndex: number,
    value: string
  ): Promise<void> => {
    const cellKey = `${shiftId}-${weekNumber}-${dayIndex}`;
    const numericValue = parseInt(value, 10);

    if (isNaN(numericValue) || numericValue < 0) {
      return;
    }

    setSavingCells((prev) => new Set([...prev, cellKey]));

    try {
      // Create updated weeks data
      const updatedWeeksData = template.weeksData.map((week) => {
        if (week.weekNumber !== weekNumber) {
          return week;
        }

        // Update or add demand for this week
        const existingDemandIndex = week.demands.findIndex(
          (d) => d.shiftId === shiftId && d.dayOfWeek === dayIndex
        );

        let updatedDemands: DemandEntryDTO[];
        if (numericValue === 0) {
          // Remove demand if value is 0
          updatedDemands = week.demands.filter(
            (d) => !(d.shiftId === shiftId && d.dayOfWeek === dayIndex)
          );
        } else if (existingDemandIndex >= 0) {
          // Update existing demand
          updatedDemands = [...week.demands];
          updatedDemands[existingDemandIndex] = {
            ...updatedDemands[existingDemandIndex],
            count: numericValue,
          };
        } else {
          // Add new demand
          updatedDemands = [
            ...week.demands,
            {
              shiftId,
              dayOfWeek: dayIndex,
              count: numericValue,
            },
          ];
        }

        return {
          ...week,
          demands: updatedDemands,
        };
      });

      // Save to API
      await ShiftDemandTemplateApi.updateTemplate(
        template.id,
        template.teamId,
        {
          weeksData: updatedWeeksData,
        }
      );

      // Update local data map for immediate UI feedback
      templateDataMap.set(cellKey, numericValue);
    } catch (error) {
      console.error("Failed to update template demand:", error);
      onError(
        error instanceof Error ? error.message : "Failed to update demand"
      );
    } finally {
      setSavingCells((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  // Bulk selection handlers
  const isCellSelected = (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ): boolean => {
    return bulkChangeState.selectedCells.some(
      (cell) =>
        cell.shiftId === shiftId &&
        cell.weekNumber === weekNumber &&
        cell.dayIndex === dayIndex
    );
  };

  const toggleCellSelection = (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ): void => {
    setBulkChangeState((prev) => {
      const isSelected = prev.selectedCells.some(
        (cell) =>
          cell.shiftId === shiftId &&
          cell.weekNumber === weekNumber &&
          cell.dayIndex === dayIndex
      );

      if (isSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (cell) =>
              !(
                cell.shiftId === shiftId &&
                cell.weekNumber === weekNumber &&
                cell.dayIndex === dayIndex
              )
          ),
        };
      } else {
        return {
          ...prev,
          selectedCells: [
            ...prev.selectedCells,
            { shiftId, weekNumber, dayIndex },
          ],
        };
      }
    });
  };

  const selectAllRowCells = (shiftId: string): void => {
    const rowCells: {
      shiftId: string;
      weekNumber: number;
      dayIndex: number;
    }[] = [];
    displayedWeeks.forEach((weekNumber) => {
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        rowCells.push({ shiftId, weekNumber, dayIndex });
      }
    });

    setBulkChangeState((prev) => {
      const isRowSelected = rowCells.every((cell) =>
        prev.selectedCells.some(
          (selected) =>
            selected.shiftId === cell.shiftId &&
            selected.weekNumber === cell.weekNumber &&
            selected.dayIndex === cell.dayIndex
        )
      );

      if (isRowSelected) {
        // Deselect all row cells
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (selected) =>
              !rowCells.some(
                (cell) =>
                  cell.shiftId === selected.shiftId &&
                  cell.weekNumber === selected.weekNumber &&
                  cell.dayIndex === selected.dayIndex
              )
          ),
        };
      } else {
        // Select all row cells
        const newCells = rowCells.filter(
          (cell) =>
            !prev.selectedCells.some(
              (selected) =>
                selected.shiftId === cell.shiftId &&
                selected.weekNumber === cell.weekNumber &&
                selected.dayIndex === cell.dayIndex
            )
        );
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, ...newCells],
        };
      }
    });
  };

  const selectAllColumnCells = (weekNumber: number, dayIndex: number): void => {
    const columnCells: {
      shiftId: string;
      weekNumber: number;
      dayIndex: number;
    }[] = [];
    shifts.forEach((shift) => {
      columnCells.push({ shiftId: shift.id, weekNumber, dayIndex });
    });

    setBulkChangeState((prev) => {
      const isColumnSelected = columnCells.every((cell) =>
        prev.selectedCells.some(
          (selected) =>
            selected.shiftId === cell.shiftId &&
            selected.weekNumber === cell.weekNumber &&
            selected.dayIndex === cell.dayIndex
        )
      );

      if (isColumnSelected) {
        // Deselect all column cells
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (selected) =>
              !columnCells.some(
                (cell) =>
                  cell.shiftId === selected.shiftId &&
                  cell.weekNumber === selected.weekNumber &&
                  cell.dayIndex === selected.dayIndex
              )
          ),
        };
      } else {
        // Select all column cells
        const newCells = columnCells.filter(
          (cell) =>
            !prev.selectedCells.some(
              (selected) =>
                selected.shiftId === cell.shiftId &&
                selected.weekNumber === cell.weekNumber &&
                selected.dayIndex === cell.dayIndex
            )
        );
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, ...newCells],
        };
      }
    });
  };

  const selectAllCells = (): void => {
    const allCells: {
      shiftId: string;
      weekNumber: number;
      dayIndex: number;
    }[] = [];
    shifts.forEach((shift) => {
      displayedWeeks.forEach((weekNumber) => {
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          allCells.push({ shiftId: shift.id, weekNumber, dayIndex });
        }
      });
    });

    setBulkChangeState((prev) => {
      const isAllSelected = allCells.every((cell) =>
        prev.selectedCells.some(
          (selected) =>
            selected.shiftId === cell.shiftId &&
            selected.weekNumber === cell.weekNumber &&
            selected.dayIndex === cell.dayIndex
        )
      );

      if (isAllSelected) {
        return { ...prev, selectedCells: [] };
      } else {
        return { ...prev, selectedCells: allCells };
      }
    });
  };

  const isRowSelected = (shiftId: string): boolean => {
    const rowCells: {
      shiftId: string;
      weekNumber: number;
      dayIndex: number;
    }[] = [];
    displayedWeeks.forEach((weekNumber) => {
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        rowCells.push({ shiftId, weekNumber, dayIndex });
      }
    });

    return rowCells.every((cell) =>
      bulkChangeState.selectedCells.some(
        (selected) =>
          selected.shiftId === cell.shiftId &&
          selected.weekNumber === cell.weekNumber &&
          selected.dayIndex === cell.dayIndex
      )
    );
  };

  const isColumnSelected = (weekNumber: number, dayIndex: number): boolean => {
    const columnCells: {
      shiftId: string;
      weekNumber: number;
      dayIndex: number;
    }[] = [];
    shifts.forEach((shift) => {
      columnCells.push({ shiftId: shift.id, weekNumber, dayIndex });
    });

    return columnCells.every((cell) =>
      bulkChangeState.selectedCells.some(
        (selected) =>
          selected.shiftId === cell.shiftId &&
          selected.weekNumber === cell.weekNumber &&
          selected.dayIndex === cell.dayIndex
      )
    );
  };

  const isAllSelected = (): boolean => {
    const allCells: {
      shiftId: string;
      weekNumber: number;
      dayIndex: number;
    }[] = [];
    shifts.forEach((shift) => {
      displayedWeeks.forEach((weekNumber) => {
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          allCells.push({ shiftId: shift.id, weekNumber, dayIndex });
        }
      });
    });

    return allCells.every((cell) =>
      bulkChangeState.selectedCells.some(
        (selected) =>
          selected.shiftId === cell.shiftId &&
          selected.weekNumber === cell.weekNumber &&
          selected.dayIndex === cell.dayIndex
      )
    );
  };

  // ...existing code...

  return (
    <Box className="template-viewer-container">
      {/* Header */}
      <Box className="template-viewer-header">
        {/* First line: Title, template info, and action buttons */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left side: Title + Template info */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Title with edit button */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="h5" component="h2">
                {template.name}
              </Typography>
              <IconButton
                size="small"
                onClick={handleEditName}
                sx={{
                  opacity: 0.6,
                  "&:hover": { opacity: 1 },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Right side: Action buttons (icons only) */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={onApply}
              color="primary"
              sx={{
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <PlayArrow />
            </IconButton>
            <IconButton
              onClick={handleDelete}
              disabled={deleteLoading}
              color="error"
            >
              {deleteLoading ? <CircularProgress size={20} /> : <Delete />}
            </IconButton>
          </Box>
        </Box>

        {/* Second line: Description */}
        {template.description && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Typography variant="body1" color="textSecondary">
              {template.description}
            </Typography>
            <IconButton
              size="small"
              onClick={handleEditDescription}
              sx={{
                opacity: 0.6,
                "&:hover": { opacity: 1 },
                mt: -0.5,
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Template Toolbar */}
        <TemplateToolbar
          lng={lng}
          template={template}
          currentWeek={currentWeek}
          weeksToShow={weeksToShow}
          templateType={templateType}
          displayedWeeks={displayedWeeks}
          totalWeeks={totalWeeks}
          onWeekChange={handleWeekChange}
          onWeeksToShowChange={handleWeeksToShowChange}
          onTemplateTypeChange={handleTemplateTypeChange}
          onAddWeek={handleAddWeek}
          onDeleteWeek={handleDeleteWeek}
          onBuildFromDemands={handleBuildFromDemands}
          onError={onError}
        />
      </Box>

      {/* Main Component */}
      <Box className="template-viewer-content" sx={{ mt: 3, p: 3 }}>
        <TemplateTable
          lng={lng}
          template={template}
          shifts={shifts}
          displayedWeeks={displayedWeeks}
          templateType={templateType}
          bulkChangeState={bulkChangeState}
          getDemandValue={getDemandValue}
          handleCellChange={handleCellChange}
          isCellSelected={isCellSelected}
          toggleCellSelection={toggleCellSelection}
          selectAllRowCells={selectAllRowCells}
          selectAllColumnCells={selectAllColumnCells}
          selectAllCells={selectAllCells}
          isRowSelected={isRowSelected}
          isColumnSelected={isColumnSelected}
          isAllSelected={isAllSelected}
          savingCells={savingCells}
          maxHeight="60vh"
        />
      </Box>

      {/* Edit Name Dialog */}
      <Dialog
        open={editNameOpen}
        onClose={() => setEditNameOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("edit_template_name")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t("template_name")}
            fullWidth
            variant="outlined"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveName();
              }
            }}
            error={
              editedName.trim().length > 0 &&
              editedName.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH
            }
            helperText={
              editedName.trim().length > 0 &&
              editedName.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH
                ? t("template_name_too_short")
                : `${editedName.length}/${TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH}`
            }
            inputProps={{
              maxLength: TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNameOpen(false)}>{t("cancel")}</Button>
          <Button
            onClick={handleSaveName}
            variant="contained"
            disabled={
              saveLoading ||
              editedName.trim() === "" ||
              editedName.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH ||
              editedName.length > TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH
            }
          >
            {saveLoading ? <CircularProgress size={20} /> : t("save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Description Dialog */}
      <Dialog
        open={editDescriptionOpen}
        onClose={() => setEditDescriptionOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("edit_template_description")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t("template_description")}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            helperText={`${editedDescription.length}/${TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}`}
            inputProps={{
              maxLength: TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDescriptionOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSaveDescription}
            variant="contained"
            disabled={saveLoading}
          >
            {saveLoading ? <CircularProgress size={20} /> : t("save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Build From Demands Dialog */}
      <BuildFromDemandsDialog
        lng={lng}
        open={buildDialogOpen}
        onClose={() => setBuildDialogOpen(false)}
        templateName={template.name}
      />
    </Box>
  );
}
