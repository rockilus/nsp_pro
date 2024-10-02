import React, { useState } from "react";
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
import ToggleButton from "@mui/material/ToggleButton";
// Components
import NewDimensionForm from "./dimension/new-dimension-form";
import PopoverRHS from "../inputs/popover-rhs";
import DimensionCell from "./dimension/dimension-cell";
import ShiftFieldCell from "./shift-field-cell/shift-field-cell";
import AttributeCell from "./attribute/attribute-cell";
import TableAddButton from "../buttons/table-add-button";
import {
  filterWorkShifts,
  filterRestShifts,
  filterRestShiftsNonDefault,
} from "./shift-utils/shift-utils";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
import "../../styles/table-styles.css";
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from "../../types/shift";
import { DimensionType } from "@/types/dimension";
import { DimensionEntryType } from "@/types/dimension";
import { DimEntryT } from "@/types/dimension";
import { DimensionT } from "@/types/dimension";
import { AttributeOwnerType } from "@/types/attribute";
import { AttributeT } from "@/types/attribute";

dayjs.extend(utc);

export default function ShiftTable({
  lng,
  selectedTeamId,
  isRest,
  dimensions,
  dimEntries,
  shifts,
  defaultShiftFields,
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
}: {
  lng: string;
  selectedTeamId: string;
  isRest: boolean;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  shifts: ShiftT[];
  defaultShiftFields: Record<string, string>[];
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
}) {
  const { t } = useTranslation(lng, "shift-page");

  const [showDefaults, setShowDefaults] = useState(false);
  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  const displayedShifts: ShiftT[] = isRest
    ? showDefaults
      ? filterRestShifts(shifts)
      : filterRestShiftsNonDefault(shifts)
    : filterWorkShifts(shifts);

  return (
    <div>
      <div className="title-container">
        <div>
          <span className="title">
            {isRest ? t("rest_shifts") : t("shifts")}
          </span>
          {isRest && (
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
          )}
        </div>
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
              setOpenParent={setPopoverRhsOpen}
              handleAddDimension={handleAddDimension}
            />
          }
          open={popoverRhsOpen}
          setOpen={setPopoverRhsOpen}
        />
      </div>
      <TableContainer style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {defaultShiftFields.map((field, index) => (
                <TableCell key={index} sx={{ paddingY: 0, fontWeight: "bold" }}>
                  <span className="table-header-default">{field.label}</span>
                </TableCell>
              ))}
              {dimensions.map((dim, dIndex) => (
                <DimensionCell
                  key={dIndex}
                  lng={lng}
                  selectedTeamId={selectedTeamId}
                  dimension={dim}
                  dimEntries={dimEntries.filter(
                    (de) => de.dimensionId === dim.id
                  )}
                  handleUpdateDimension={handleUpdateDimension}
                  handleDeleteDimension={handleDeleteDimension}
                  handleAddDimEntry={handleAddDimEntry}
                  handleUpdateDimEntry={handleUpdateDimEntry}
                  handleDeleteDimEntry={handleDeleteDimEntry}
                />
              ))}
              <TableCell sx={{ padding: 0, width: 110 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedShifts.map((shift, shiftIndex) => (
              <TableRow
                key={shiftIndex}
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                  backgroundColor:
                    shift.leaveType !== ShiftLeaveType.NONE ||
                    shift.restType === ShiftRestType.OFF
                      ? "#1a0dab0a"
                      : "None",
                }}
              >
                {defaultShiftFields.map((field, index) => (
                  <ShiftFieldCell
                    key={index}
                    lng={lng}
                    shift={shift}
                    shifts={shifts}
                    shiftField={field.name}
                    editing={bodyEditing}
                    setEditing={setBodyEditing}
                    handleUpdateShift={handleUpdateShift}
                  />
                ))}
                {dimensions.map((dim, dIndex) => {
                  const attribute = shift.attributes.find(
                    (a) => a.dimensionId === dim.id
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
                        (de) => de.dimensionId === dim.id
                      )}
                      editing={bodyEditing[shift.id] === dim.id}
                      setEditing={setBodyEditing}
                      handleUpdateAttribute={handleUpdateAttribute}
                    />
                  );
                })}
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
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
