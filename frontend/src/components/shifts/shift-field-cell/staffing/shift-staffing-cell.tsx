import React, { useState } from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import ShiftStaffingCellEdit from "./shift-staffing-cell-edit";
import PopoverAnchorElOver from "../../../inputs/popover-anchor-el-over";
// Styles
import "./shift-staffing-cell.css";
// Types
import { SpecialtyT } from "@/types/specialty";
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

  const specialtyAny: SpecialtyT = {
    id: "any_specialty_id",
    teamId: "",
    name: "Any",
    deleted: false,
  };

  const buildSelectedSpecialties = () => {
    return valueState
      .map((v) => {
        if (v.specialtyId === null) {
          return specialtyAny;
        }
        return specialties.find((s) => s.id === v.specialtyId);
      })
      .filter((specialty) => specialty !== undefined);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddStaffing = (specialty: SpecialtyT) => {
    const updatedValue = [
      ...valueState,
      {
        specialtyId: specialty.id === "any_specialty_id" ? null : specialty.id,
        staffing: 1,
      },
    ];
    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const handleRemoveStaffing = (specialty: SpecialtyT) => {
    const specialtyIdToRemove =
      specialty.id === "any_specialty_id" ? null : specialty.id;
    const updatedValue = valueState.filter(
      (v) => v.specialtyId !== specialtyIdToRemove
    );
    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const handleIncreaseStaffing = (
    event: React.SyntheticEvent,
    staffing: StaffingT
  ) => {
    event.stopPropagation();
    const updatedValue = valueState.map((v) => {
      if (v.specialtyId === staffing.specialtyId) {
        return {
          ...v,
          staffing: v.staffing + 1,
        };
      }
      return v;
    });
    console.log();

    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const handleDecreaseStaffing = (
    event: React.SyntheticEvent,
    staffing: StaffingT
  ) => {
    event.stopPropagation();
    const updatedValue = valueState.map((v) => {
      if (v.specialtyId === staffing.specialtyId) {
        return {
          ...v,
          staffing: Math.max(0, v.staffing - 1),
        };
      }
      return v;
    });
    setValueState(updatedValue);
    handleUpdateShift({
      ...shift,
      staffing: updatedValue,
    });
  };

  const AdjustStaffingButtons = ({ staffing }: { staffing: StaffingT }) => {
    return (
      <div className="adjust-staffing-buttons">
        <div
          role="button"
          tabIndex={0}
          className="adjust-button adjust-button-top"
          onClick={(e) => handleIncreaseStaffing(e, staffing)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              handleIncreaseStaffing(e, staffing);
          }}
        >
          +
        </div>
        <div
          role="button"
          tabIndex={0}
          className="adjust-button adjust-button-bottom"
          onClick={(e) => handleDecreaseStaffing(e, staffing)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              handleDecreaseStaffing(e, staffing);
          }}
        >
          –
        </div>
      </div>
    );
  };

  const StaffingChip = ({ staffing }: { staffing: StaffingT }) => {
    const specialty = specialties.find((s) => s.id === staffing.specialtyId);
    return (
      <div className="chip">
        <span className="chip-label">{`${
          staffing.specialtyId === null
            ? "Any"
            : specialty
            ? specialty.name
            : "Name not found"
        }: ${staffing.staffing}`}</span>
        <span className="chip-delete">
          <AdjustStaffingButtons staffing={staffing} />
        </span>
      </div>
    );
  };

  const ButtonContent = () => {
    return (
      <div className="chips-container">
        {shift.staffing.map((staffing, index) => (
          <StaffingChip
            key={staffing.specialtyId || index}
            staffing={staffing}
          />
        ))}
      </div>
    );
  };

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
        buttonContent={<ButtonContent />}
        content={
          <ShiftStaffingCellEdit
            selectedSpecialties={buildSelectedSpecialties()}
            specialties={[specialtyAny, ...specialties]}
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
