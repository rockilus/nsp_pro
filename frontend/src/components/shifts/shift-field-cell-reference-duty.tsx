import React, { Dispatch, SetStateAction, useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
// Components
import { filterDutyShifts } from "./shift-utils/shift-utils";
// Styles
import "./shift-field-cell-reference-duty.css";
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from "../../types/shift";

export default function ShiftFieldCellReferenceDuty({
  lng,
  shift,
  shifts,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  lng: string;
  shift: ShiftT;
  shifts: ShiftT[];
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const { t } = useTranslation(lng, "shift-page");

  const dutyShifts = filterDutyShifts(shifts);

  const [valueState, setValueState] = useState<string>(
    shift.recuperationDutyIds.length > 0 ? shift.recuperationDutyIds[0] : ""
  );

  const handleEditConfirm = () => {
    if (valueState !== shift.recuperationDutyIds[0]) {
      handleUpdateShift({ ...shift, recuperationDutyIds: [valueState] });
    }
    setEditing({});
  };

  const displayReferenceDuty = () => {
    const foundShift = dutyShifts.find((ds) => ds.id === valueState);
    return foundShift ? (
      foundShift.name
    ) : (
      <span className="select-duty-message">{t("select_a_duty")}</span>
    );
  };

  const selectReferenceDuty = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 0.5, width: 100 }}>
        <FormControl fullWidth>
          <Select
            value={
              shift.recuperationDutyIds.length > 0
                ? dutyShifts.find(
                    (ds) => ds.id === shift.recuperationDutyIds[0]
                  )?.id
                : ""
            }
            label="Duty"
            onChange={(e) => setValueState(e.target.value)}
            onBlur={handleEditConfirm}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEditConfirm();
              } else if (e.key === "Escape") {
                handleEditCancel();
              }
            }}
          >
            {dutyShifts.map((ds) => (
              <MenuItem key={ds.id} value={ds.id}>
                {ds.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.recuperationDutyIds[0]);
  };

  useEffect(() => {
    if (shift.recuperationDutyIds.length > 0) {
      setValueState(shift.recuperationDutyIds[0]);
    } else {
      setValueState("");
    }
  }, [shift.recuperationDutyIds]);

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() =>
        shift.leaveType === ShiftLeaveType.NONE &&
        shift.restType !== ShiftRestType.OFF &&
        shift.restType === ShiftRestType.RECUPERATION &&
        setEditing({ [shift.id]: "reference_duty" })
      }
      sx={{
        paddingY: 0,
        cursor:
          shift.leaveType === ShiftLeaveType.NONE &&
          shift.restType !== ShiftRestType.OFF &&
          shift.restType === ShiftRestType.RECUPERATION
            ? "pointer"
            : "default",
      }}
    >
      {shift.restType === ShiftRestType.RECUPERATION ? (
        editing ? (
          selectReferenceDuty()
        ) : (
          displayReferenceDuty()
        )
      ) : (
        <span className="not-applicable-label">{t("not_applicable")}</span>
      )}
    </TableCell>
  );
}
