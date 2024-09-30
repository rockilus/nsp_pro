import React, { Dispatch, SetStateAction, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Styles
import "./shift-field-cell-recuperation.css";
// Types
import { ShiftT, ShiftType } from "../../types/shift";

dayjs.extend(utc);

export default function ShiftFieldCellRecuperation({
  lng,
  shift,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  lng: string;
  shift: ShiftT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const { t } = useTranslation(lng, "shift-page");

  const [valueState, setValueState] = useState<number | "">(
    shift.recuperationTime
  );

  const handleEditConfirm = () => {
    if (valueState !== shift.recuperationTime && valueState !== "") {
      handleUpdateShift({ ...shift, recuperationTime: valueState });
    } else if (valueState === "") {
      setValueState(shift.recuperationTime);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.recuperationTime);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() =>
        shift.shiftType === ShiftType.DUTY &&
        setEditing({ [shift.id]: "reference_duty" })
      }
      sx={{
        paddingY: 0,
        cursor: shift.shiftType === ShiftType.DUTY ? "pointer" : "default",
      }}
    >
      {shift.shiftType === ShiftType.DUTY ? (
        editing ? (
          <TextField
            fullWidth
            type="number"
            name="Staffing"
            value={valueState}
            onChange={(e) =>
              setValueState(e.target.value === "" ? "" : Number(e.target.value))
            }
            onBlur={handleEditConfirm}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEditConfirm();
              } else if (e.key === "Escape") {
                handleEditCancel();
              }
            }}
            autoFocus
          />
        ) : (
          shift.recuperationTime
        )
      ) : (
        <span className="not-applicable-label">{t("not_applicable")}</span>
      )}
    </TableCell>
  );
}
