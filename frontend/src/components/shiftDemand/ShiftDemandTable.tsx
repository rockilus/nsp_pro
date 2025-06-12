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
import { ShiftT } from "../../types/shift";
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
  onCellChange: (shiftId: string, date: Dayjs, value: string) => Promise<void>;
  onToggleSelection: (shiftId: string, date: Dayjs) => void;
}

function ShiftDemandCell({
  shiftId,
  date,
  value,
  isWeekend,
  isSelected,
  isBulkMode,
  isSaving,
  onCellChange,
  onToggleSelection,
}: ShiftDemandCellProps) {
  const [isHovered, setIsHovered] = useState(false);

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

  return (
    <TableCell className={`shift-demand-cell ${isWeekend ? "weekend" : ""}`}>
      {isBulkMode ? (
        <div className={`shift-demand-bulk ${isSelected ? "selected" : ""}`}>
          <Checkbox
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
            // Empty state
            <div
              className={`shift-demand-empty ${isHovered ? "hovered" : ""}`}
              onClick={handleAddDemand}
            >
              {isSaving ? (
                <CircularProgress size={16} />
              ) : (
                isHovered && <Add className="shift-demand-empty-icon" />
              )}
            </div>
          ) : (
            // Demand state
            <div
              className={`shift-demand-content ${isHovered ? "hovered" : ""} ${
                isSaving ? "saving" : ""
              }`}
            >
              {isSaving && (
                <CircularProgress size={16} className="shift-demand-loading" />
              )}

              {/* Decrement button */}
              {isHovered && !isSaving && (
                <button
                  onClick={handleDecrement}
                  className="shift-demand-button decrement"
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
              >
                {value}
              </span>

              {/* Increment button */}
              {isHovered && !isSaving && (
                <button
                  onClick={handleIncrement}
                  className="shift-demand-button increment"
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
  return (
    <TableCell className="shift-demand-row-header">
      <div className="shift-demand-row-header-content">
        {isBulkMode && (
          <Checkbox
            checked={isRowSelected}
            onChange={() => onSelectRow(shift.id)}
            size="small"
          />
        )}
        <Tooltip title={shift.name}>
          <div className="shift-demand-shift-info">
            <Typography variant="body2" noWrap sx={{ fontSize: "0.875rem" }}>
              {shift.acronym || shift.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: "0.75rem", color: "text.secondary" }}
            >
              {shift.startTime.format("HH:mm")} -{" "}
              {shift.endTime.format("HH:mm")}
            </Typography>
          </div>
        </Tooltip>
      </div>
    </TableCell>
  );
}

// Individual shift row component
interface ShiftDemandRowProps {
  shift: ShiftT;
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
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
            onCellChange={handleCellChange}
            onToggleSelection={toggleCellSelection}
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
}

function ShiftDemandTableHeader({
  lng,
  dates,
  bulkChangeState,
  selectAllColumnCells,
  selectAllCells,
  isColumnSelected,
  isAllSelected,
}: ShiftDemandTableHeaderProps) {
  const { t } = useTranslation(lng, "shift-demands");

  return (
    <TableHead>
      <TableRow>
        <TableCell className="shift-demand-table-header">
          {bulkChangeState.isActive ? (
            <div className="shift-demand-header-content">
              <Checkbox
                checked={isAllSelected()}
                indeterminate={
                  bulkChangeState.selectedCells.length > 0 && !isAllSelected()
                }
                onChange={selectAllCells}
                size="small"
              />
              <Typography variant="body2">{t("shift")}</Typography>
            </div>
          ) : (
            t("shift")
          )}
        </TableCell>
        {dates.map((date) => (
          <TableCell
            key={date.toISOString()}
            className={`shift-demand-table-header date-column ${
              date.day() === 0 || date.day() === 6 ? "weekend" : ""
            }`}
          >
            <div className="shift-demand-date-info">
              {bulkChangeState.isActive && (
                <Checkbox
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
      {shifts.map((shift) => (
        <ShiftDemandRow
          key={shift.id}
          shift={shift}
          dates={dates}
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
export default function ShiftDemandTable({
  lng,
  shifts,
  dates,
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
  maxHeight = "70vh", // Default to 70% of viewport height
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
          zIndex: 1,
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
        />
        <ShiftDemandTableBody
          lng={lng}
          shifts={shifts}
          dates={dates}
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
