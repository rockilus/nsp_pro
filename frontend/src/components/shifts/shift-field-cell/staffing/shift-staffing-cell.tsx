import React, { useState } from "react";
// MUI
import Chip from "@mui/material/Chip";
import TableCell from "@mui/material/TableCell";
// Components
import ShiftStaffingCellEdit from "./shift-staffing-cell-edit";
import PopoverAnchorElOver from "../../../inputs/popover-anchor-el-over";
// Types
import { SpecialtyT } from "../../../../types/team";
import { ShiftT, StaffingT } from "../../../../types/shift";

export default function ShiftStaffingCell({
  shift,
  specialties,
  handleUpdateShift,
}: {
  shift: ShiftT;
  specialties: SpecialtyT[];
  handleUpdateShift: (shift: ShiftT) => void;
}) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<StaffingT[]>(shift.staffing);

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddStaffing = (specialty: SpecialtyT) => {
    const updatedValue = [
      ...valueState,
      { specialtyId: specialty.id, staffing: 1 },
    ];
    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const handleRemoveStaffing = (specialty: SpecialtyT) => {
    const updatedValue = valueState.filter(
      (v) => v.specialtyId !== specialty.id
    );
    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const buttonContent = shift.staffing.map((staffing, index) => {
    const specialty = specialties.find((s) => s.id === staffing.specialtyId);
    return (
      <Chip
        key={staffing.specialtyId || index}
        label={
          <span>{`${
            staffing.specialtyId === null
              ? "Any"
              : specialty
              ? specialty.name
              : "Name not found"
          }: ${staffing.staffing}`}</span>
        }
        sx={{ cursor: "pointer" }}
      />
    );
  });

  return (
    <TableCell
      component="th"
      scope="row"
      sx={{
        paddingY: 0,
        cursor: "pointer",
      }}
    >
      <PopoverAnchorElOver
        buttonContent={buttonContent}
        content={
          <ShiftStaffingCellEdit
            selectedSpecialties={specialties.filter(
              (s) =>
                !valueState.find((v) => v.specialtyId === s.id) || s.id === null
            )}
            specialties={specialties}
            handleAddStaffing={handleAddStaffing}
            handleRemoveStaffing={handleRemoveStaffing}
            handleClose={handleClose}
          />
        }
        open={open}
        setOpen={setOpen}
      />
    </TableCell>
  );
}
