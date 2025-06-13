/**
 * Template Table Component - Display and edit template demands in a week-based grid
 *
 * Features:
 * - Week-based header (Week 1, Week 2, etc.) with day abbreviations
 * - Monday-Sunday layout (Week starts Monday, ends Sunday)
 * - Identical cell functionality to ShiftDemandTable
 * - Template-specific data handling
 * - Bulk selection and editing
 * - Weekend styling
 */

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  CircularProgress,
  Typography,
  Tooltip,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useTranslation } from "../../../app/i18n/client";
import { ShiftT, ShiftType } from "../../../types/shift";
import {
  ShiftDemandTemplateDTO,
  DemandEntryDTO,
  TemplateType,
} from "../../../types/shift-demand-template";
import {
  ColumnDefinition,
  ColumnFilter,
  TableSort,
} from "../../../types/filter";
import { ShiftColorMappings } from "../../../constants/constants";
import ColumnSortFilterMenu from "../../table/ColumnSortFilterMenu";
import "./TemplateTable.css";

// Types
interface SelectedCell {
  shiftId: string;
  weekNumber: number;
  dayIndex: number;
}

interface BulkChangeState {
  isActive: boolean;
  selectedCells: SelectedCell[];
  bulkValue: string;
}

interface TemplateTableProps {
  lng: string;
  template: ShiftDemandTemplateDTO;
  shifts: ShiftT[];
  displayedWeeks: number[];
  templateType: TemplateType;
  bulkChangeState: BulkChangeState;
  getDemandValue: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => number;
  handleCellChange: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number,
    value: string
  ) => Promise<void>;
  isCellSelected: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => boolean;
  toggleCellSelection: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => void;
  selectAllRowCells: (shiftId: string) => void;
  selectAllColumnCells: (weekNumber: number, dayIndex: number) => void;
  selectAllCells: () => void;
  isRowSelected: (shiftId: string) => boolean;
  isColumnSelected: (weekNumber: number, dayIndex: number) => boolean;
  isAllSelected: () => boolean;
  savingCells: Set<string>;
  maxHeight?: string;
  // Filter/Sort props
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  shiftColumn?: ColumnDefinition;
}

// Individual cell component
interface TemplateCellProps {
  shiftId: string;
  weekNumber: number;
  dayIndex: number;
  value: number;
  isWeekend: boolean;
  isSelected: boolean;
  isBulkMode: boolean;
  isSaving: boolean;
  shift: ShiftT;
  isWeekBoundary?: boolean;
  onCellChange: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number,
    value: string
  ) => Promise<void>;
  onToggleSelection: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => void;
}

function TemplateCell({
  shiftId,
  weekNumber,
  dayIndex,
  value,
  isWeekend,
  isSelected,
  isBulkMode,
  isSaving,
  shift,
  isWeekBoundary = false,
  onCellChange,
  onToggleSelection,
}: TemplateCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get shift colors from the mapping
  const { background, sample, text } = ShiftColorMappings[shift.color] || {
    background: "#f5f5f5",
    sample: "#9e9e9e",
    text: "#212121",
  };

  const handleAddDemand = async () => {
    if (isSaving) return;
    await onCellChange(shiftId, weekNumber, dayIndex, "1");
  };

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    await onCellChange(shiftId, weekNumber, dayIndex, String(value + 1));
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    const newValue = Math.max(0, value - 1);
    await onCellChange(shiftId, weekNumber, dayIndex, String(newValue));
  };

  return (
    <TableCell
      className={`template-cell ${isWeekend ? "weekend" : ""} ${
        isWeekBoundary ? "week-boundary" : ""
      }`}
      style={
        {
          "--shift-bg-color": background,
          "--shift-sample-color": sample,
          "--shift-text-color": text,
        } as React.CSSProperties
      }
    >
      {isBulkMode ? (
        <div className={`template-bulk ${isSelected ? "selected" : ""}`}>
          <Checkbox
            checked={isSelected}
            onChange={() => onToggleSelection(shiftId, weekNumber, dayIndex)}
            size="small"
          />
        </div>
      ) : (
        <div
          className={`template-cell-content ${value === 0 ? "clickable" : ""}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {value === 0 ? (
            // Empty state with shift color theming
            <div
              className={`template-empty ${isHovered ? "hovered" : ""}`}
              onClick={handleAddDemand}
            >
              {isSaving ? (
                <CircularProgress size={16} />
              ) : (
                isHovered && <Add className="template-empty-icon" />
              )}
            </div>
          ) : (
            <div
              className={`template-content ${isHovered ? "hovered" : ""} ${
                isSaving ? "saving" : ""
              }`}
            >
              {isSaving && (
                <CircularProgress
                  size={12}
                  className="template-loading"
                  color="inherit"
                />
              )}
              <span className={`template-value ${isSaving ? "saving" : ""}`}>
                {value}
              </span>
              {isHovered && !isSaving && (
                <>
                  <IconButton
                    className="template-button decrement"
                    onClick={handleDecrement}
                    size="small"
                  >
                    <Remove className="template-button-icon" />
                  </IconButton>
                  <IconButton
                    className="template-button increment"
                    onClick={handleIncrement}
                    size="small"
                  >
                    <Add className="template-button-icon" />
                  </IconButton>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </TableCell>
  );
}

// Row header component
interface TemplateRowHeaderProps {
  shift: ShiftT;
  isBulkMode: boolean;
  isRowSelected: boolean;
  onSelectRow: (shiftId: string) => void;
}

function TemplateRowHeader({
  shift,
  isBulkMode,
  isRowSelected,
  onSelectRow,
}: TemplateRowHeaderProps) {
  const { background, sample, text } = ShiftColorMappings[shift.color] || {
    background: "#f5f5f5",
    sample: "#9e9e9e",
    text: "#212121",
  };

  const isNextDay = !shift.endTime.isSame(shift.startTime, "day");
  const isDutyShift = shift.shiftType === ShiftType.DUTY;

  return (
    <TableCell
      className="template-row-header"
      sx={{
        padding: 0,
        minWidth: 80,
        maxWidth: 120,
        position: "relative",
      }}
    >
      <div className="template-row-header-container">
        {/* Shift type marker for duty shifts, placeholder for non-duty shifts */}
        <div
          className={`template-type-marker ${
            isDutyShift ? "duty" : "placeholder"
          }`}
          style={{ "--bg-color": sample } as React.CSSProperties}
        />

        {/* Bulk mode checkbox */}
        {isBulkMode && (
          <Checkbox
            checked={isRowSelected}
            onChange={() => onSelectRow(shift.id)}
            size="small"
            sx={{ mr: 0.5 }}
          />
        )}

        {/* Shift name with truncation */}
        <div className="template-name-container">
          <Tooltip title={shift.name}>
            <Typography
              variant="body2"
              className="template-name"
              sx={{ fontSize: "0.875rem", fontWeight: 550 }}
            >
              {shift.name || shift.acronym}
            </Typography>
          </Tooltip>
        </div>

        {/* Time display */}
        <div className="template-time-container">
          <Typography
            variant="caption"
            className="template-time"
            sx={{ fontSize: "0.75rem", color: "text.secondary" }}
          >
            {shift.startTime.format("HH:mm")}
          </Typography>
          <Typography
            variant="caption"
            className="template-time"
            sx={{ fontSize: "0.75rem", color: "text.secondary" }}
          >
            {shift.endTime.format("HH:mm")}
            {isNextDay && <sup>+1</sup>}
          </Typography>
        </div>
      </div>
    </TableCell>
  );
}

// Individual shift row component
interface TemplateRowProps {
  shift: ShiftT;
  displayedWeeks: number[];
  templateType: TemplateType;
  bulkChangeState: BulkChangeState;
  getDemandValue: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => number;
  handleCellChange: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number,
    value: string
  ) => Promise<void>;
  isCellSelected: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => boolean;
  toggleCellSelection: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => void;
  selectAllRowCells: (shiftId: string) => void;
  isRowSelected: (shiftId: string) => boolean;
  savingCells: Set<string>;
}

function TemplateRow({
  shift,
  displayedWeeks,
  templateType,
  bulkChangeState,
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  isRowSelected,
  savingCells,
}: TemplateRowProps) {
  return (
    <TableRow hover>
      <TemplateRowHeader
        shift={shift}
        isBulkMode={bulkChangeState.isActive}
        isRowSelected={isRowSelected(shift.id)}
        onSelectRow={selectAllRowCells}
      />
      {displayedWeeks.map((weekNumber, weekIndex) =>
        Array.from({ length: 7 }, (_, dayIndex) => {
          const value = getDemandValue(shift.id, weekNumber, dayIndex);
          const isWeekend = dayIndex === 5 || dayIndex === 6; // Saturday=5, Sunday=6
          const isSelected = isCellSelected(shift.id, weekNumber, dayIndex);
          const cellKey = `${shift.id}-${weekNumber}-${dayIndex}`;
          const isSaving = savingCells.has(cellKey);
          // Add week boundary class for Monday of week 2, 3, etc.
          const isWeekBoundary = weekIndex > 0 && dayIndex === 0; // Monday of non-first weeks

          return (
            <TemplateCell
              key={cellKey}
              shiftId={shift.id}
              weekNumber={weekNumber}
              dayIndex={dayIndex}
              value={value}
              isWeekend={isWeekend}
              isSelected={isSelected}
              isBulkMode={bulkChangeState.isActive}
              isSaving={isSaving}
              shift={shift}
              onCellChange={handleCellChange}
              onToggleSelection={toggleCellSelection}
              isWeekBoundary={isWeekBoundary}
            />
          );
        })
      )}
    </TableRow>
  );
}

// Table header component
interface TemplateTableHeaderProps {
  lng: string;
  displayedWeeks: number[];
  templateType: TemplateType;
  bulkChangeState: BulkChangeState;
  selectAllColumnCells: (weekNumber: number, dayIndex: number) => void;
  selectAllCells: () => void;
  isColumnSelected: (weekNumber: number, dayIndex: number) => boolean;
  isAllSelected: () => boolean;
  // Filter/Sort props
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  shiftColumn?: ColumnDefinition;
}

function TemplateTableHeader({
  lng,
  displayedWeeks,
  templateType,
  bulkChangeState,
  selectAllColumnCells,
  selectAllCells,
  isColumnSelected,
  isAllSelected,
  currentSort,
  currentFilter,
  onSort,
  onFilter,
  shiftColumn,
}: TemplateTableHeaderProps) {
  const { t } = useTranslation(lng, "shift-demand-templates");

  // Day names (Monday to Sunday)
  const dayNames = [
    t("monday_short", "Mon"),
    t("tuesday_short", "Tue"),
    t("wednesday_short", "Wed"),
    t("thursday_short", "Thu"),
    t("friday_short", "Fri"),
    t("saturday_short", "Sat"),
    t("sunday_short", "Sun"),
  ];

  return (
    <TableHead>
      {/* Week header row */}
      <TableRow>
        <TableCell
          className="template-header-corner"
          rowSpan={2}
          sx={{ position: "relative" }}
        >
          <div className="template-header-content">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {bulkChangeState.isActive ? (
                <>
                  <Checkbox
                    checked={isAllSelected()}
                    indeterminate={
                      bulkChangeState.selectedCells.length > 0 &&
                      !isAllSelected()
                    }
                    onChange={selectAllCells}
                    size="small"
                  />
                  <Typography variant="body2">{t("shift", "Shift")}</Typography>
                </>
              ) : (
                <Typography variant="body2">{t("shift", "Shift")}</Typography>
              )}
            </div>

            {/* Filter/Sort menu - aligned horizontally with content */}
            {shiftColumn && onSort && onFilter && (
              <ColumnSortFilterMenu
                column={shiftColumn}
                currentSort={currentSort}
                currentFilter={currentFilter}
                onSort={onSort}
                onFilter={onFilter}
              />
            )}
          </div>
        </TableCell>
        {displayedWeeks.map((weekNumber, weekIndex) => {
          const weekLabel =
            templateType === TemplateType.EVEN_ODD
              ? weekNumber === 0
                ? t("even_week", "Even Week")
                : t("odd_week", "Odd Week")
              : t("week_number", "Week {{number}}", { number: weekNumber + 1 });

          // Add week boundary class for weeks 2, 3, etc.
          const isWeekBoundary = weekIndex > 0;

          return (
            <TableCell
              key={`week-${weekNumber}`}
              className={`template-week-header ${
                templateType === TemplateType.EVEN_ODD
                  ? weekNumber === 0
                    ? "even"
                    : "odd"
                  : ""
              } ${isWeekBoundary ? "week-boundary" : ""}`}
              colSpan={7}
              align="center"
            >
              {weekLabel}
            </TableCell>
          );
        })}
      </TableRow>

      {/* Day header row */}
      <TableRow>
        {displayedWeeks.map((weekNumber, weekIndex) =>
          dayNames.map((dayName, dayIndex) => {
            const isWeekend = dayIndex === 5 || dayIndex === 6;
            const isSelected = isColumnSelected(weekNumber, dayIndex);
            // Add week boundary class for Monday of week 2, 3, etc.
            const isWeekBoundary = weekIndex > 0 && dayIndex === 0; // Monday of non-first weeks

            return (
              <TableCell
                key={`${weekNumber}-${dayIndex}`}
                className={`template-day-header ${isWeekend ? "weekend" : ""} ${
                  isWeekBoundary ? "week-boundary" : ""
                }`}
                align="center"
              >
                {bulkChangeState.isActive ? (
                  <div className="template-day-header-content">
                    <Checkbox
                      checked={isSelected}
                      onChange={() =>
                        selectAllColumnCells(weekNumber, dayIndex)
                      }
                      size="small"
                    />
                    <span className="template-day-name">{dayName}</span>
                  </div>
                ) : (
                  dayName
                )}
              </TableCell>
            );
          })
        )}
      </TableRow>
    </TableHead>
  );
}

// Table body component
interface TemplateTableBodyProps {
  lng: string;
  shifts: ShiftT[];
  displayedWeeks: number[];
  templateType: TemplateType;
  bulkChangeState: BulkChangeState;
  getDemandValue: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => number;
  handleCellChange: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number,
    value: string
  ) => Promise<void>;
  isCellSelected: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => boolean;
  toggleCellSelection: (
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) => void;
  selectAllRowCells: (shiftId: string) => void;
  isRowSelected: (shiftId: string) => boolean;
  savingCells: Set<string>;
}

function TemplateTableBody({
  lng,
  shifts,
  displayedWeeks,
  templateType,
  bulkChangeState,
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  isRowSelected,
  savingCells,
}: TemplateTableBodyProps) {
  return (
    <TableBody>
      {shifts.map((shift) => (
        <TemplateRow
          key={shift.id}
          shift={shift}
          displayedWeeks={displayedWeeks}
          templateType={templateType}
          bulkChangeState={bulkChangeState}
          getDemandValue={getDemandValue}
          handleCellChange={handleCellChange}
          isCellSelected={isCellSelected}
          toggleCellSelection={toggleCellSelection}
          selectAllRowCells={selectAllRowCells}
          isRowSelected={isRowSelected}
          savingCells={savingCells}
        />
      ))}
    </TableBody>
  );
}

// Main table component
export default function TemplateTable({
  lng,
  template,
  shifts,
  displayedWeeks,
  templateType,
  bulkChangeState,
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  selectAllColumnCells,
  selectAllCells,
  isRowSelected,
  isColumnSelected,
  isAllSelected,
  savingCells,
  maxHeight = "70vh",
  currentSort,
  currentFilter,
  onSort,
  onFilter,
  shiftColumn,
}: TemplateTableProps) {
  return (
    <TableContainer
      sx={{
        maxHeight: maxHeight,
        overflowY: "auto",
        overflowX: "auto",
        scrollBehavior: "smooth",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        "& .MuiTableHead-root": {
          position: "sticky",
          top: 0,
          zIndex: 2,
          backgroundColor: "background.paper",
        },
        "& .MuiTableHead-root::after": {
          content: '""',
          position: "absolute",
          bottom: -1,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(to right, transparent, rgba(0,0,0,0.1), transparent)",
          opacity: 0,
          transition: "opacity 0.2s ease-in-out",
        },
        "&.scrolled .MuiTableHead-root::after": {
          opacity: 1,
        },
      }}
      onScroll={(e) => {
        const target = e.target as HTMLElement;
        const isScrolled = target.scrollTop > 0;
        target
          .closest(".MuiTableContainer-root")
          ?.classList.toggle("scrolled", isScrolled);
      }}
    >
      <Table stickyHeader>
        <TemplateTableHeader
          lng={lng}
          displayedWeeks={displayedWeeks}
          templateType={templateType}
          bulkChangeState={bulkChangeState}
          selectAllColumnCells={selectAllColumnCells}
          selectAllCells={selectAllCells}
          isColumnSelected={isColumnSelected}
          isAllSelected={isAllSelected}
          currentSort={currentSort}
          currentFilter={currentFilter}
          onSort={onSort}
          onFilter={onFilter}
          shiftColumn={shiftColumn}
        />
        <TemplateTableBody
          lng={lng}
          shifts={shifts}
          displayedWeeks={displayedWeeks}
          templateType={templateType}
          bulkChangeState={bulkChangeState}
          getDemandValue={getDemandValue}
          handleCellChange={handleCellChange}
          isCellSelected={isCellSelected}
          toggleCellSelection={toggleCellSelection}
          selectAllRowCells={selectAllRowCells}
          isRowSelected={isRowSelected}
          savingCells={savingCells}
        />
      </Table>
    </TableContainer>
  );
}
