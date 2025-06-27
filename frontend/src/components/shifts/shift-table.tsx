import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
// Components
import NewDimensionForm from "../shift-worker-shared/dimension/new-dimension-form";
import PopoverRHS from "../inputs/popover-rhs";
import DimensionCell from "../shift-worker-shared/dimension/dimension-cell";
import ShiftFieldCell from "./shift-field-cell/shift-field-cell";
import AttributeCell from "../shift-worker-shared/attribute/attribute-cell";
import TableAddButton from "../buttons/table-add-button";
import ColumnSortFilterMenu from "../table/ColumnSortFilterMenu";
import {
  filterWorkShifts,
  filterRestShifts,
  filterRestShiftsNonDefault,
} from "./shift-utils/shift-utils";
import LinkShiftDialog from "./link-shift/link-shift-dialog";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
import "../../styles/table-styles.css";
import "./shift-table.css";
// Types
import {
  ShiftT,
  ShiftLeaveType,
  ShiftRestType,
  LinkShiftT,
} from "../../types/shift";
import { DimensionType } from "../../types/dimension";
import { DimensionEntryType } from "../../types/dimension";
import { DimEntryT } from "@/types/dim-entry";
import { DimensionT } from "../../types/dimension";
import { AttributeOwnerType } from "../../types/attribute";
import { AttributeT } from "../../types/attribute";
import { SpecialtyT } from "@/types/specialty";
import { ColumnDefinition, ColumnFilter, TableSort } from "../../types/filter";

dayjs.extend(utc);

export default function ShiftTable({
  lng,
  selectedTeamId,
  isRest,
  dimensions,
  dimEntries,
  shifts,
  specialties,
  linkShifts,
  defaultShiftFields,
  tableHeight = "70vh",
  // New props for sorting/filtering
  shiftColumns,
  currentSort,
  onSort,
  onFilter,
  handleAddShift,
  handleUpdateShift,
  handleDeleteShift,
  handleAddDimension,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
  handleUpdateAttribute,
  handleAddLinkShift,
  handleDeleteLinkShift,
}: ShiftTableProps) {
  const { t } = useTranslation(lng, "shift-page");

  const [showDefaults, setShowDefaults] = useState(false);
  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  const displayedShifts: ShiftT[] = isRest
    ? showDefaults
      ? filterRestShifts(shifts)
      : filterRestShiftsNonDefault(shifts)
    : filterWorkShifts(shifts);

  const dimensionsDisplayed = dimensions.filter((dim: DimensionT) =>
    isRest
      ? dim.dimTypes.includes(DimensionType.REST_SHIFT)
      : dim.dimTypes.includes(DimensionType.SHIFT)
  );

  // Memoize filtered dimensions for performance
  const displayedDimensions = React.useMemo(
    () =>
      dimensions.filter((dim: DimensionT) =>
        isRest
          ? dim.dimTypes.includes(DimensionType.REST_SHIFT)
          : dim.dimTypes.includes(DimensionType.SHIFT)
      ),
    [dimensions, isRest]
  );

  return (
    <div>
      <div className="title-container">
        <div>
          <span className="title">
            {isRest ? t("rest_shifts") : t("shifts")}
          </span>
          {/* {isRest && (
            <ToggleButton
              value="breaches"
              sx={{
                textTransform: "none",
                height: "35px",
                fontSize: "0.9rem",
                marginLeft: "20px",
              }}
              selected={showDefaults}
              onClick={() => setShowDefaults(!showDefaults)}
            >
              {t("show_default_shifts")}
            </ToggleButton>
          )} */}
        </div>
        <div className="shift-actions-container">
          {!isRest && (
            <LinkShiftDialog
              lng={lng}
              teamId={selectedTeamId}
              shifts={shifts}
              linkShifts={linkShifts}
              handleAddLinkShift={handleAddLinkShift}
              handleDeleteLinkShift={handleDeleteLinkShift}
            />
          )}
          <PopoverRHS
            title={t("new_property")}
            buttonContent={<TableAddButton text={t("property")} />}
            content={
              <NewDimensionForm
                lng={lng}
                selectedTeamId={selectedTeamId}
                dimensionType={
                  isRest ? DimensionType.REST_SHIFT : DimensionType.SHIFT
                }
                dimensions={dimensions}
                dimEntries={dimEntries}
                setOpenParent={setPopoverRhsOpen}
                handleAddDimension={handleAddDimension}
                handleUpdateDimension={handleUpdateDimension}
              />
            }
            open={popoverRhsOpen}
            setOpen={setPopoverRhsOpen}
          />
        </div>
      </div>
      <TableContainer
        className="shared-table-container"
        style={{ height: tableHeight }}
      >
        <Table
          className="shared-table"
          sx={{ minWidth: 650 }}
          aria-label="simple table"
        >
          <TableHead className="shared-table-header">
            <TableRow>
              {defaultShiftFields.map(
                (field: Record<string, string>, index: number) => (
                  <TableCell
                    key={index}
                    sx={{ paddingY: 0, fontWeight: "bold" }}
                  >
                    <div className="flex items-center justify-between">
                      <Tooltip title={field.label} placement="top">
                        <span className="table-header-default">
                          {field.label}
                        </span>
                      </Tooltip>
                      {onSort &&
                        onFilter &&
                        shiftColumns &&
                        (() => {
                          const column = shiftColumns.find(
                            (col) => col.id === field.name
                          );
                          return column ? (
                            <ColumnSortFilterMenu
                              column={column}
                              currentSort={
                                currentSort?.columnId === field.name
                                  ? currentSort
                                  : undefined
                              }
                              currentFilter={undefined}
                              onSort={onSort}
                              onFilter={onFilter}
                            />
                          ) : null;
                        })()}
                    </div>
                  </TableCell>
                )
              )}
              {displayedDimensions.map((dim: DimensionT, dIndex: number) => (
                <DimensionCell
                  key={dIndex}
                  lng={lng}
                  selectedTeamId={selectedTeamId}
                  dimensionTypeTable={
                    isRest ? DimensionType.REST_SHIFT : DimensionType.SHIFT
                  }
                  dimension={dim}
                  dimEntries={dimEntries.filter(
                    (de: DimEntryT) => de.dimensionId === dim.id
                  )}
                  handleUpdateDimension={handleUpdateDimension}
                  handleDeleteDimension={handleDeleteDimension}
                  handleAddDimEntry={handleAddDimEntry}
                  handleUpdateDimEntry={handleUpdateDimEntry}
                  handleDeleteDimEntry={handleDeleteDimEntry}
                />
              ))}
              <TableCell
                className="shared-table-actions"
                sx={{ padding: 0 }}
              ></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedShifts.map((shift: ShiftT, shiftIndex: number) => (
              <TableRow
                key={shiftIndex}
                className="shared-table-row"
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                  backgroundColor:
                    shift.leaveType !== ShiftLeaveType.NONE ||
                    shift.restType === ShiftRestType.OFF
                      ? "#1a0dab0a !important"
                      : "inherit",
                }}
              >
                {defaultShiftFields.map(
                  (field: Record<string, string>, index: number) => (
                    <ShiftFieldCell
                      key={index}
                      lng={lng}
                      shift={shift}
                      specialties={specialties}
                      shiftField={field.name}
                      editing={bodyEditing}
                      setEditing={setBodyEditing}
                      handleUpdateShift={handleUpdateShift}
                    />
                  )
                )}
                {displayedDimensions.map((dim: DimensionT, dIndex: number) => {
                  const attribute = shift.attributes.find(
                    (a: AttributeT) => a.dimensionId === dim.id
                  );
                  return (
                    <AttributeCell
                      key={dIndex}
                      selectedTeamId={selectedTeamId}
                      attribute={
                        attribute
                          ? attribute
                          : {
                              id: "",
                              ownerType: AttributeOwnerType.SHIFT,
                              ownerId: shift.id,
                              dimensionId: dim.id,
                              value:
                                dim.entryType === DimensionEntryType.BOOL
                                  ? false
                                  : "",
                              dimEntryIds: [],
                            }
                      }
                      dimension={dim}
                      dimEntries={dimEntries.filter(
                        (de: DimEntryT) => de.dimensionId === dim.id
                      )}
                      editing={bodyEditing[shift.id] === dim.id}
                      setEditing={setBodyEditing}
                      handleUpdateAttribute={handleUpdateAttribute}
                    />
                  );
                })}
                <TableCell
                  component="th"
                  scope="row"
                  className="shared-table-actions"
                  sx={{ paddingY: 0 }}
                >
                  <Box sx={{ display: "flex" }}>
                    <Button
                      disabled={
                        shift.leaveType !== ShiftLeaveType.NONE ||
                        shift.restType === ShiftRestType.OFF
                      }
                      onClick={() => handleDeleteShift(shift.id)}
                    >
                      <DeleteIcon />
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {displayedShifts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={
                    defaultShiftFields.length + displayedDimensions.length + 1
                  }
                  sx={{ textAlign: "center", py: 4, color: "text.secondary" }}
                >
                  {t(isRest ? "no_rest_shifts_found" : "no_shifts_found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="add-row-button-container">
        <TableAddButton
          text={isRest ? t("rest") : t("shift")}
          handleClick={() => handleAddShift(isRest)}
        />
      </div>
    </div>
  );
}

// Types for the main component and sub-components
interface ShiftTableProps {
  lng: string;
  selectedTeamId: string;
  isRest: boolean;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  shifts: ShiftT[];
  specialties: SpecialtyT[];
  linkShifts: LinkShiftT[];
  defaultShiftFields: Record<string, string>[];
  tableHeight?: string;
  // New props for sorting/filtering
  shiftColumns?: ColumnDefinition[];
  currentSort?: TableSort | null;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  handleAddShift: (isRest: boolean) => void;
  handleUpdateShift: (updatedShift: ShiftT) => void;
  handleDeleteShift: (shiftId: string) => void;
  handleAddDimension: (
    newDimension: DimensionT,
    newDimEntries: DimEntryT[]
  ) => Promise<boolean>;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (dimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
  handleAddLinkShift: (linkShift: LinkShiftT) => void;
  handleDeleteLinkShift: (linkShiftId: string) => void;
}

interface ShiftTableHeaderProps {
  lng: string;
  selectedTeamId: string;
  isRest: boolean;
  specialties: SpecialtyT[];
  defaultShiftFields: Record<string, string>[];
  displayedDimensions: DimensionT[];
  dimEntries: DimEntryT[];
  shiftColumns?: ColumnDefinition[];
  currentSort?: TableSort | null;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (dimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
}

interface ShiftTableRowProps {
  lng: string;
  selectedTeamId: string;
  shift: ShiftT;
  specialties: SpecialtyT[];
  defaultShiftFields: Record<string, string>[];
  displayedDimensions: DimensionT[];
  dimEntries: DimEntryT[];
  bodyEditing: { [key: string]: string };
  setBodyEditing: React.Dispatch<
    React.SetStateAction<{ [key: string]: string }>
  >;
  handleUpdateShift: (updatedShift: ShiftT) => void;
  handleDeleteShift: (shiftId: string) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
}

interface ShiftNameCellProps {
  shift: ShiftT;
  bodyEditing: { [key: string]: string };
  setBodyEditing: React.Dispatch<
    React.SetStateAction<{ [key: string]: string }>
  >;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}
