import React, { useState } from "react";
// MUI
import Chip from "@mui/material/Chip";
import TableCell from "@mui/material/TableCell";
// Components
import WorkerSpecialtyCellEdit from "./worker-specialty-cell-edit";
import PopoverAnchorElOver from "../../../inputs/popover-anchor-el-over";
// Types
import { SpecialtyT } from "../../../../types/team";
import { WorkerT } from "../../../../types/worker";

export default function WorkerSpecialtyCell({
  worker,
  specialties,
  handleUpdateWorker,
}: {
  worker: WorkerT;
  specialties: SpecialtyT[];
  handleUpdateWorker: (worker: WorkerT) => void;
}) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<SpecialtyT[]>(
    specialties.filter((s) => worker.specialtyIds.includes(s.id))
  );

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddSpecialty = (specialty: SpecialtyT) => {
    const updatedValue = [...valueState, specialty];
    setValueState(updatedValue);
    handleUpdateWorker({
      ...worker,
      specialtyIds: updatedValue.map((v) => v.id),
    });
  };

  const handleRemoveSpecialty = (specialty: SpecialtyT) => {
    const updatedValue = valueState.filter((v) => v.id !== specialty.id);
    setValueState(updatedValue);
    handleUpdateWorker({
      ...worker,
      specialtyIds: updatedValue.map((v) => v.id),
    });
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
        buttonContent={worker.specialtyIds.map((sId, index) => (
          <Chip
            key={sId}
            label={specialties.find((s) => s.id === sId)?.name || ""}
            sx={{ cursor: "pointer" }}
          />
        ))}
        content={
          <WorkerSpecialtyCellEdit
            selectedSpecialties={valueState}
            specialties={specialties}
            handleAddSpecialty={handleAddSpecialty}
            handleRemoveSpecialty={handleRemoveSpecialty}
            handleClose={handleClose}
          />
        }
        open={open}
        setOpen={setOpen}
      />
    </TableCell>
  );
}
