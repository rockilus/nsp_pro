import React, { useState } from "react";
import { Dayjs } from "dayjs";
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Checkbox,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useTranslation } from "../../app/i18n/client";
import { ShiftT, ShiftType } from "../../types/shift";
import { MultitaskingSelectionState } from "../../types/multitasking";
import { ShiftColorMappings } from "../../constants/constants";
import { ColumnDefinition, ColumnFilter, TableSort } from "../../types/filter";
import ColumnSortFilterMenu from "../table/ColumnSortFilterMenu";
import "./ShiftDemandTable.css";

// Types
interface SelectedCell {
  shiftId: string;
  date: string;
}

interface BulkChangeState {
  isActive: boolean;
  selectedCells: SelectedCell[];
  bulkValue: string;
}

interface ShiftDemandTableProps {
  lng: string;
  shifts: ShiftT[];
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
  // Multitasking props
  multitaskingState?: MultitaskingSelectionState;
  onToggleShiftDemandSelection?: (shiftDemandId: string) => void;
  isShiftDemandSelectable?: (shiftId: string, date: Dayjs) => boolean;
  isShiftDemandSelected?: (shiftId: string, date: Dayjs) => boolean;
  // Regular props
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (
    shiftId: string,
    date: Dayjs,
    value: string
  ) => Promise<void>;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  selectAllColumnCells: (date: Dayjs) => void;
  selectAllCells: () => void;
  isRowSelected: (shiftId: string) => boolean;
  isColumnSelected: (date: Dayjs) => boolean;
  isAllSelected: () => boolean;
  savingCells: Set<string>;
  maxHeight?: string; // New optional prop for controlling height
  // New props for filtering/sorting
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  shiftColumn?: ColumnDefinition;
}

// Individual cell component
interface ShiftDemandCellProps {
  shiftId: string;
  date: Dayjs;
  value: number;
  isWeekend: boolean;
  isSelected: boolean;
  isBulkMode: boolean;
  isSaving: boolean;
  shift: ShiftT; // Add shift object to get color information
  // Multitasking props
  isMultitaskingMode?: boolean;
  isSelectable?: boolean;
  isMultitaskingSelected?: boolean;
  onCellChange: (shiftId: string, date: Dayjs, value: string) => Promise<void>;
  onToggleSelection: (shiftId: string, date: Dayjs) => void;
  onToggleMultitaskingSelection?: (shiftDemandId: string) => void;
}

function ShiftDemandCell({
  shiftId,
  date,
  value,
  isWeekend,
  isSelected,
  isBulkMode,
  isSaving,
  shift, // Add shift prop
  isMultitaskingMode = false,
  isSelectable = true,
  isMultitaskingSelected = false,
  onCellChange,
  onToggleSelection,
  onToggleMultitaskingSelection,
}: ShiftDemandCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get shift colors from the mapping
  const { background, sample, text } = ShiftColorMappings[shift.color] || {
    background: "#f5f5f5",
    sample: "#9e9e9e",
    text: "#212121",
  };

  const handleAddDemand = async () => {
    if (isSaving) return;
    await onCellChange(shiftId, date, "1");
  };

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    await onCellChange(shiftId, date, String(value + 1));
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    const newValue = Math.max(0, value - 1);
    await onCellChange(shiftId, date, String(newValue));
  };

  const handleCellClick = () => {
    if (isMultitaskingMode && onToggleMultitaskingSelection) {
      const shiftDemandId = `${shiftId}-${date.format("YYYY-MM-DD")}`;
      onToggleMultitaskingSelection(shiftDemandId);
    } else if (value === 0) {
      handleAddDemand();
    }
  };

  // Apply multitasking styling
  const getCellClassName = () => {
    let className = `shift-demand-cell ${isWeekend ? "weekend" : ""}`;
    if (isMultitaskingMode) {
      if (!isSelectable) {
        className += " multitasking-disabled";
      } else if (isMultitaskingSelected) {
        className += " multitasking-selected";
      } else {
        className += " multitasking-available";
      }
    }
    return className;
  };

  return (
    <TableCell
      className={getCellClassName()}
      data-testid={`shift-demand-cell-${shiftId}-${date.format("YYYY-MM-DD")}`}
      style={
        {
          "--shift-bg-color": background,
          "--shift-sample-color": sample,
          "--shift-text-color": text,
        } as React.CSSProperties
      }
      onClick={isMultitaskingMode ? handleCellClick : undefined}
      sx={{
        cursor: isMultitaskingMode
          ? isSelectable
            ? "pointer"
            : "not-allowed"
          : "default",
        opacity: isMultitaskingMode && !isSelectable ? 0.5 : 1,
      }}
    >
      {isBulkMode ? (
        <div className={`shift-demand-bulk ${isSelected ? "selected" : ""}`}>
          <Checkbox
            data-testid={`cell-select-checkbox-${shiftId}-${date.format(
              "YYYY-MM-DD"
            )}`}
            checked={isSelected}
            onChange={() => onToggleSelection(shiftId, date)}
            size="small"
          />
          <Typography variant="caption" sx={{ ml: 0.5 }}>
            {value}
          </Typography>
        </div>
      ) : (
        <div
          className={`shift-demand-cell-content ${
            value === 0 ? "clickable" : ""
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {value === 0 ? (
            // Empty state with shift color theming
            <div
              className={`shift-demand-empty ${isHovered ? "hovered" : ""}`}
              data-testid={`shift-demand-empty-${shiftId}-${date.format(
                "YYYY-MM-DD"
              )}`}
              onClick={!isMultitaskingMode ? handleAddDemand : undefined}
            >
              {isSaving ? (
                <CircularProgress size={16} />
              ) : (
                isHovered && <Add className="shift-demand-empty-icon" />
              )}
            </div>
          ) : (
            // Demand state with shift color theming
            <div
              className={`shift-demand-content ${isHovered ? "hovered" : ""} ${
                isSaving ? "saving" : ""
              }`}
            >
              {isSaving && (
                <CircularProgress size={16} className="shift-demand-loading" />
              )}

              {/* Decrement button */}
              {isHovered && !isSaving && !isMultitaskingMode && (
                <button
                  onClick={handleDecrement}
                  className="shift-demand-button decrement"
                  data-testid={`shift-demand-decrement-${shiftId}-${date.format(
                    "YYYY-MM-DD"
                  )}`}
                >
                  <Remove
                    className="shift-demand-button-icon"
                    sx={{ fontSize: "14px" }}
                  />
                </button>
              )}

              {/* Value display */}
              <span
                className={`shift-demand-value ${isSaving ? "saving" : ""}`}
                data-testid={`shift-demand-value-${shiftId}-${date.format(
                  "YYYY-MM-DD"
                )}`}
              >
                {value}
              </span>

              {/* Increment button */}
              {isHovered && !isSaving && !isMultitaskingMode && (
                <button
                  onClick={handleIncrement}
                  className="shift-demand-button increment"
                  data-testid={`shift-demand-increment-${shiftId}-${date.format(
                    "YYYY-MM-DD"
                  )}`}
                >
                  <Add
                    className="shift-demand-button-icon"
                    sx={{ fontSize: "14px" }}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </TableCell>
  );
}

// Row header component
interface ShiftDemandRowHeaderProps {
  shift: ShiftT;
  isBulkMode: boolean;
  isRowSelected: boolean;
  onSelectRow: (shiftId: string) => void;
}

function ShiftDemandRowHeader({
  shift,
  isBulkMode,
  isRowSelected,
  onSelectRow,
}: ShiftDemandRowHeaderProps) {
  const { background, sample, text } = ShiftColorMappings[shift.color] || {
    background: "#f5f5f5",
    sample: "#9e9e9e",
    text: "#212121",
  };

  const isNextDay = !shift.endTime.isSame(shift.startTime, "day");
  const isDutyShift = shift.shiftType === ShiftType.DUTY;

  return (
    <TableCell
      className="shift-demand-row-header"
      data-testid={`shift-demand-row-header-${shift.id}`}
      sx={{
        padding: 0,
        minWidth: 180,
        maxWidth: 220,
        position: "relative",
      }}
    >
      <div className="shift-demand-row-header-container">
        {/* Shift type marker for duty shifts, placeholder for non-duty shifts */}
        <div
          className={`shift-demand-type-marker ${
            isDutyShift ? "duty" : "placeholder"
          }`}
          style={{ "--bg-color": sample } as React.CSSProperties}
        />

        {/* Bulk mode checkbox */}
        {isBulkMode && (
          <Checkbox
            data-testid={`row-select-checkbox-${shift.id}`}
            checked={isRowSelected}
            onChange={() => onSelectRow(shift.id)}
            size="small"
            sx={{ mr: 0.5 }}
          />
        )}

        {/* Shift name with truncation */}
        <div className="shift-demand-name-container">
          <Tooltip title={shift.name}>
            <Typography
              variant="body2"
              className="shift-demand-name"
              data-testid={`shift-demand-name-${shift.id}`}
              sx={{ fontSize: "0.875rem", fontWeight: 550 }}
            >
              {shift.name || shift.acronym}
            </Typography>
          </Tooltip>
        </div>

        {/* Time display */}
        <div className="shift-demand-time-container">
          <Typography
            variant="caption"
            className="shift-demand-time"
            sx={{ fontSize: "0.75rem", color: "text.secondary" }}
          >
            {shift.startTime.format("HH:mm")}
          </Typography>
          <Typography
            variant="caption"
            className="shift-demand-time"
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
interface ShiftDemandRowProps {
  shift: ShiftT;
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
  // Multitasking props
  multitaskingState?: MultitaskingSelectionState;
  onToggleShiftDemandSelection?: (shiftDemandId: string) => void;
  isShiftDemandSelectable?: (shiftId: string, date: Dayjs) => boolean;
  isShiftDemandSelected?: (shiftId: string, date: Dayjs) => boolean;
  // Regular props
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (
    shiftId: string,
    date: Dayjs,
    value: string
  ) => Promise<void>;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  isRowSelected: (shiftId: string) => boolean;
  savingCells: Set<string>;
}

function ShiftDemandRow({
  shift,
  dates,
  bulkChangeState,
  // Multitasking props
  multitaskingState,
  onToggleShiftDemandSelection,
  isShiftDemandSelectable,
  isShiftDemandSelected,
  // Regular props
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  isRowSelected,
  savingCells,
}: ShiftDemandRowProps) {
  const shiftTotal = dates.reduce(
    (sum, date) => sum + getDemandValue(shift.id, date),
    0
  );

  return (
    <TableRow hover>
      <ShiftDemandRowHeader
        shift={shift}
        isBulkMode={bulkChangeState.isActive}
        isRowSelected={isRowSelected(shift.id)}
        onSelectRow={selectAllRowCells}
      />
      {dates.map((date) => {
        const value = getDemandValue(shift.id, date);
        const isWeekend = date.day() === 0 || date.day() === 6;
        const isSelected = isCellSelected(shift.id, date);
        const cellKey = `${shift.id}-${date.format("YYYY-MM-DD")}`;
        const isSaving = savingCells.has(cellKey);

        return (
          <ShiftDemandCell
            key={date.toISOString()}
            shiftId={shift.id}
            date={date}
            value={value}
            isWeekend={isWeekend}
            isSelected={isSelected}
            isBulkMode={bulkChangeState.isActive}
            isSaving={isSaving}
            shift={shift} // Pass the shift object
            // Multitasking props
            isMultitaskingMode={multitaskingState?.isActive || false}
            isSelectable={
              isShiftDemandSelectable
                ? isShiftDemandSelectable(shift.id, date)
                : true
            }
            isMultitaskingSelected={
              isShiftDemandSelected
                ? isShiftDemandSelected(shift.id, date)
                : false
            }
            onCellChange={handleCellChange}
            onToggleSelection={toggleCellSelection}
            onToggleMultitaskingSelection={onToggleShiftDemandSelection}
          />
        );
      })}
      <TableCell className="shift-demand-total">{shiftTotal}</TableCell>
    </TableRow>
  );
}

// Table header component
interface ShiftDemandTableHeaderProps {
  lng: string;
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
  selectAllColumnCells: (date: Dayjs) => void;
  selectAllCells: () => void;
  isColumnSelected: (date: Dayjs) => boolean;
  isAllSelected: () => boolean;
  // Filter/Sort props
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  shiftColumn?: ColumnDefinition;
}

function ShiftDemandTableHeader({
  lng,
  dates,
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
}: ShiftDemandTableHeaderProps) {
  const { t } = useTranslation(lng, "shift-demands");

  return (
    <TableHead>
      <TableRow>
        <TableCell
          className="shift-demand-table-header"
          sx={{ position: "relative" }}
        >
          <div className="shift-demand-header-content">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {bulkChangeState.isActive ? (
                <>
                  <Checkbox
                    data-testid="select-all-checkbox"
                    checked={isAllSelected()}
                    indeterminate={
                      bulkChangeState.selectedCells.length > 0 &&
                      !isAllSelected()
                    }
                    onChange={selectAllCells}
                    size="small"
                  />
                  <Typography variant="body2">{t("shift")}</Typography>
                </>
              ) : (
                <Typography variant="body2">{t("shift")}</Typography>
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
        {dates.map((date) => (
          <TableCell
            key={date.toISOString()}
            className={`shift-demand-table-header date-column ${
              date.day() === 0 || date.day() === 6 ? "weekend" : ""
            }`}
            data-testid={`date-header-${date.format("YYYY-MM-DD")}`}
          >
            <div className="shift-demand-date-info">
              {bulkChangeState.isActive && (
                <Checkbox
                  data-testid={`column-select-checkbox-${date.format(
                    "YYYY-MM-DD"
                  )}`}
                  checked={isColumnSelected(date)}
                  onChange={() => selectAllColumnCells(date)}
                  size="small"
                />
              )}
              <Typography
                variant="caption"
                sx={{ fontSize: "0.75rem", display: "block" }}
              >
                {date.format("ddd")}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                {date.format("D")}
              </Typography>
            </div>
          </TableCell>
        ))}
        <TableCell className="shift-demand-table-header total-column">
          {t("total")}
        </TableCell>
      </TableRow>
    </TableHead>
  );
}

// Table body component
interface ShiftDemandTableBodyProps {
  lng: string;
  shifts: ShiftT[];
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
  // Multitasking props
  multitaskingState?: MultitaskingSelectionState;
  onToggleShiftDemandSelection?: (shiftDemandId: string) => void;
  isShiftDemandSelectable?: (shiftId: string, date: Dayjs) => boolean;
  isShiftDemandSelected?: (shiftId: string, date: Dayjs) => boolean;
  // Regular props
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (
    shiftId: string,
    date: Dayjs,
    value: string
  ) => Promise<void>;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  isRowSelected: (shiftId: string) => boolean;
  savingCells: Set<string>;
}

function ShiftDemandTableBody({
  lng,
  shifts,
  dates,
  bulkChangeState,
  // Multitasking props
  multitaskingState,
  onToggleShiftDemandSelection,
  isShiftDemandSelectable,
  isShiftDemandSelected,
  // Regular props
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  isRowSelected,
  savingCells,
}: ShiftDemandTableBodyProps) {
  return (
    <TableBody>
      {shifts.map((shift, index) => (
        <ShiftDemandRow
          key={shift.id}
          shift={shift}
          dates={dates}
          bulkChangeState={bulkChangeState}
          // Multitasking props
          multitaskingState={multitaskingState}
          onToggleShiftDemandSelection={onToggleShiftDemandSelection}
          isShiftDemandSelectable={isShiftDemandSelectable}
          isShiftDemandSelected={isShiftDemandSelected}
          // Regular props
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
export default function ShiftDemandTable({
  lng,
  shifts,
  dates,
  bulkChangeState,
  // Multitasking props
  multitaskingState,
  onToggleShiftDemandSelection,
  isShiftDemandSelectable,
  isShiftDemandSelected,
  // Regular props
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
  maxHeight = "70vh", // Default to 70% of viewport height
  currentSort,
  currentFilter,
  onSort,
  onFilter,
  shiftColumn,
}: ShiftDemandTableProps) {
  return (
    <TableContainer
      sx={{
        maxHeight: maxHeight,
        overflowY: "auto",
        overflowX: "auto",
        // Ensure smooth scrolling
        scrollBehavior: "smooth",
        // Add subtle border to indicate scrollable area
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        // Ensure the sticky header has proper z-index
        "& .MuiTableHead-root": {
          position: "sticky",
          top: 0,
          zIndex: 2,
          backgroundColor: "background.paper",
        },
        // Add subtle shadow under header when scrolling
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
        // Show shadow when scrolled
        "&.scrolled .MuiTableHead-root::after": {
          opacity: 1,
        },
      }}
      // Add scroll event listener to handle header shadow
      onScroll={(e) => {
        const container = e.currentTarget;
        if (container.scrollTop > 0) {
          container.classList.add("scrolled");
        } else {
          container.classList.remove("scrolled");
        }
      }}
    >
      <Table size="small" stickyHeader>
        <ShiftDemandTableHeader
          lng={lng}
          dates={dates}
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
        <ShiftDemandTableBody
          lng={lng}
          shifts={shifts}
          dates={dates}
          bulkChangeState={bulkChangeState}
          // Multitasking props
          multitaskingState={multitaskingState}
          onToggleShiftDemandSelection={onToggleShiftDemandSelection}
          isShiftDemandSelectable={isShiftDemandSelectable}
          isShiftDemandSelected={isShiftDemandSelected}
          // Regular props
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
