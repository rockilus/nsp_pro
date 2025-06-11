import React from "react";
import { Dayjs } from "dayjs";
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Box,
  Checkbox,
  TextField,
  Tooltip,
} from "@mui/material";
import { useTranslation } from "../../app/i18n/client";
import { ShiftT } from "../../types/shift";

// Types
interface CellEdit {
  shiftId: string;
  date: string;
  value: number;
}

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
  pendingEdits: CellEdit[];
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (shiftId: string, date: Dayjs, value: string) => void;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  selectAllColumnCells: (date: Dayjs) => void;
  selectAllCells: () => void;
  isRowSelected: (shiftId: string) => boolean;
  isColumnSelected: (date: Dayjs) => boolean;
  isAllSelected: () => boolean;
}

// Individual cell component
interface ShiftDemandCellProps {
  shiftId: string;
  date: Dayjs;
  value: number;
  isWeekend: boolean;
  isSelected: boolean;
  isBulkMode: boolean;
  hasPendingEdit: boolean;
  onCellChange: (shiftId: string, date: Dayjs, value: string) => void;
  onToggleSelection: (shiftId: string, date: Dayjs) => void;
}

function ShiftDemandCell({
  shiftId,
  date,
  value,
  isWeekend,
  isSelected,
  isBulkMode,
  hasPendingEdit,
  onCellChange,
  onToggleSelection,
}: ShiftDemandCellProps) {
  return (
    <TableCell
      sx={{
        p: 0.5,
        backgroundColor: isWeekend ? "grey.50" : "inherit",
      }}
    >
      {isBulkMode ? (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{
            backgroundColor: isSelected ? "primary.50" : "transparent",
            borderRadius: 1,
            p: 0.5,
          }}
        >
          <Checkbox
            checked={isSelected}
            onChange={() => onToggleSelection(shiftId, date)}
            size="small"
          />
          <Typography variant="caption" sx={{ ml: 0.5 }}>
            {value}
          </Typography>
        </Box>
      ) : (
        <TextField
          size="small"
          type="number"
          value={value}
          onChange={(e) => onCellChange(shiftId, date, e.target.value)}
          inputProps={{
            min: 0,
            style: {
              textAlign: "center",
              padding: "4px 8px",
              fontSize: "0.875rem",
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                border: "1px solid",
                borderColor: hasPendingEdit ? "primary.main" : "grey.300",
              },
            },
          }}
        />
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
    <TableCell sx={{ fontWeight: "medium" }}>
      <Box display="flex" alignItems="center" gap={1}>
        {isBulkMode && (
          <Checkbox
            checked={isRowSelected}
            onChange={() => onSelectRow(shift.id)}
            size="small"
          />
        )}
        <Tooltip title={shift.name}>
          <Box>
            <Typography variant="body2" noWrap>
              {shift.acronym || shift.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {shift.startTime.format("HH:mm")} -{" "}
              {shift.endTime.format("HH:mm")}
            </Typography>
          </Box>
        </Tooltip>
      </Box>
    </TableCell>
  );
}

// Individual shift row component
interface ShiftDemandRowProps {
  shift: ShiftT;
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
  pendingEdits: CellEdit[];
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (shiftId: string, date: Dayjs, value: string) => void;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  isRowSelected: (shiftId: string) => boolean;
}

function ShiftDemandRow({
  shift,
  dates,
  bulkChangeState,
  pendingEdits,
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  isRowSelected,
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
        const hasPendingEdit = pendingEdits.some(
          (edit) =>
            edit.shiftId === shift.id && edit.date === date.format("YYYY-MM-DD")
        );

        return (
          <ShiftDemandCell
            key={date.toISOString()}
            shiftId={shift.id}
            date={date}
            value={value}
            isWeekend={isWeekend}
            isSelected={isSelected}
            isBulkMode={bulkChangeState.isActive}
            hasPendingEdit={hasPendingEdit}
            onCellChange={handleCellChange}
            onToggleSelection={toggleCellSelection}
          />
        );
      })}
      <TableCell align="center" sx={{ fontWeight: "bold" }}>
        {shiftTotal}
      </TableCell>
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
        <TableCell sx={{ fontWeight: "bold", minWidth: 120 }}>
          {bulkChangeState.isActive ? (
            <Box display="flex" alignItems="center" gap={1}>
              <Checkbox
                checked={isAllSelected()}
                indeterminate={
                  bulkChangeState.selectedCells.length > 0 && !isAllSelected()
                }
                onChange={selectAllCells}
                size="small"
              />
              <Typography variant="body2">{t("shift")}</Typography>
            </Box>
          ) : (
            t("shift")
          )}
        </TableCell>
        {dates.map((date) => (
          <TableCell
            key={date.toISOString()}
            align="center"
            sx={{
              fontWeight: "bold",
              minWidth: 60,
              backgroundColor:
                date.day() === 0 || date.day() === 6 ? "grey.50" : "inherit",
            }}
          >
            <Box>
              {bulkChangeState.isActive && (
                <Checkbox
                  checked={isColumnSelected(date)}
                  onChange={() => selectAllColumnCells(date)}
                  size="small"
                />
              )}
              <Typography variant="caption" display="block">
                {date.format("ddd")}
              </Typography>
              <Typography variant="body2">{date.format("D")}</Typography>
            </Box>
          </TableCell>
        ))}
        <TableCell align="center" sx={{ fontWeight: "bold", minWidth: 80 }}>
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
  pendingEdits: CellEdit[];
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (shiftId: string, date: Dayjs, value: string) => void;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  isRowSelected: (shiftId: string) => boolean;
}

function ShiftDemandTableBody({
  lng,
  shifts,
  dates,
  bulkChangeState,
  pendingEdits,
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  isRowSelected,
}: ShiftDemandTableBodyProps) {
  return (
    <TableBody>
      {shifts.map((shift) => (
        <ShiftDemandRow
          key={shift.id}
          shift={shift}
          dates={dates}
          bulkChangeState={bulkChangeState}
          pendingEdits={pendingEdits}
          getDemandValue={getDemandValue}
          handleCellChange={handleCellChange}
          isCellSelected={isCellSelected}
          toggleCellSelection={toggleCellSelection}
          selectAllRowCells={selectAllRowCells}
          isRowSelected={isRowSelected}
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
  pendingEdits,
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
}: ShiftDemandTableProps) {
  return (
    <TableContainer>
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
          pendingEdits={pendingEdits}
          getDemandValue={getDemandValue}
          handleCellChange={handleCellChange}
          isCellSelected={isCellSelected}
          toggleCellSelection={toggleCellSelection}
          selectAllRowCells={selectAllRowCells}
          isRowSelected={isRowSelected}
        />
      </Table>
    </TableContainer>
  );
}
