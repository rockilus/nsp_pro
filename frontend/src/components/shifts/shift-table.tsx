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
// Components
import NewShiftDimensionForm from "./new-shift-dimension-form";
import PopoverRHS from "../inputs/popover-rhs";
import ShiftDimensionCell from "./shift-dimension-cell";
import ShiftFieldCell from "./shift-field-cell";
import ShiftPropertyCell from "./shift-property-cell";
import TableAddButton from "../buttons/table-add-button";
// Styles
import "../../styles/tab-container-styles.css";
import "../../styles/text-styles.css";
import "../../styles/table-styles.css";
// Types
import {
  ShiftDimensionT,
  ShiftT,
  ShiftPropertyT,
  ShiftLeaveType,
} from "../../types/shift";

dayjs.extend(utc);

export default function ShiftTable({
  lng,
  selectedTeamId,
  isRest,
  shiftDimensions,
  shifts,
  defaultShiftFields,
  handleAddShift,
  handleDeleteShift,
  handleAddShiftDimension,
  handleUpdateShiftProperty,
  handleUpdateShiftDimension,
  handleUpdateShift,
  handleDeleteShiftDimension,
}: {
  lng: string;
  selectedTeamId: string;
  isRest: boolean;
  shiftDimensions: ShiftDimensionT[];
  shifts: ShiftT[];
  defaultShiftFields: Record<string, string>[];
  handleAddShift: (isRest: boolean) => void;
  handleDeleteShift: (shiftId: string) => void;
  handleAddShiftDimension: (
    newShiftDimension: ShiftDimensionT
  ) => Promise<boolean>;
  handleUpdateShiftProperty: (
    shiftProperty: ShiftPropertyT,
    teamId: string
  ) => void;
  handleUpdateShiftDimension: (shiftDimension: ShiftDimensionT) => void;
  handleUpdateShift: (updatedShift: ShiftT) => void;
  handleDeleteShiftDimension: (shiftDimensionId: string) => void;
}) {
  const { t } = useTranslation(lng, "shift-page");

  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  const defaultProperties: {
    str: string;
    int: string;
    bool: boolean;
    list: string[];
    [key: string]: string | boolean | string[];
  } = {
    str: "",
    int: "",
    bool: false,
    list: [],
  };

  return (
    <div>
      <div className="title-container">
        <span className="title">{isRest ? t("rest_shifts") : t("shifts")}</span>
        <PopoverRHS
          title={t("new_property")}
          buttonContent={<TableAddButton text={t("property")} />}
          content={
            <NewShiftDimensionForm
              lng={lng}
              selectedTeamId={selectedTeamId}
              isRest={isRest}
              setOpenParent={setPopoverRhsOpen}
              handleAddShiftDimension={handleAddShiftDimension}
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
              {shiftDimensions.map((sd, sdIndex) => (
                <ShiftDimensionCell
                  key={sdIndex}
                  lng={lng}
                  selectedTeamId={selectedTeamId}
                  shiftDimension={sd}
                  handleUpdateShiftDimension={handleUpdateShiftDimension}
                  handleDeleteShiftDimension={handleDeleteShiftDimension}
                />
              ))}
              <TableCell sx={{ padding: 0, width: 110 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift, shiftIndex) => (
              <TableRow
                key={shiftIndex}
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                  backgroundColor:
                    shift.leaveType === ShiftLeaveType.NONE
                      ? "None"
                      : "#1a0dab0a",
                }}
              >
                {defaultShiftFields.map((field, index) => (
                  <ShiftFieldCell
                    key={index}
                    shift={shift}
                    shiftField={field.name}
                    editing={bodyEditing}
                    setEditing={setBodyEditing}
                    handleUpdateShift={handleUpdateShift}
                  />
                ))}
                {shiftDimensions.map((sd, sdIndex) => {
                  const shiftProperty = shift.shiftProperties.find(
                    (sp) => sp.shiftDimensionId === sd.id
                  );
                  return (
                    <ShiftPropertyCell
                      key={sdIndex}
                      selectedTeamId={selectedTeamId}
                      shiftProperty={
                        shiftProperty
                          ? shiftProperty
                          : {
                              id: "",
                              shiftId: shift.id,
                              shiftDimensionId: sd.id,
                              value: defaultProperties[sd.entryType],
                            }
                      }
                      shiftDimension={sd}
                      editing={bodyEditing[shift.id] === sd.id}
                      setEditing={setBodyEditing}
                      handleUpdateShiftProperty={handleUpdateShiftProperty}
                    />
                  );
                })}
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  <Box sx={{ display: "flex" }}>
                    <Button
                      disabled={shift.leaveType !== ShiftLeaveType.NONE}
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
