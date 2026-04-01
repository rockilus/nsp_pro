import React, { useState } from "react";
// MUI
import Chip from "@mui/material/Chip";
import TableCell from "@mui/material/TableCell";
// Components
import WorkerSpecialtyCellEdit from "./worker-specialty-cell-edit";
import PopoverAnchorElOver from "../../../inputs/popover-anchor-el-over";
// Types
import { SpecialtyT } from "@/types/specialty";
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
    specialties.filter((s) => worker.specialtyIds.includes(s.id)),
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddSpecialty = (specialty: SpecialtyT) => {
    setIsUpdating(true);
    const updatedValue = [...valueState, specialty];
    setValueState(updatedValue);
    handleUpdateWorker({
      ...worker,
      specialtyIds: updatedValue.map((v) => v.id),
    });
    // Reset updating state after a brief moment to allow the update to complete
    setTimeout(() => setIsUpdating(false), 100);
  };

  const handleRemoveSpecialty = (specialty: SpecialtyT) => {
    setIsUpdating(true);
    const updatedValue = valueState.filter((v) => v.id !== specialty.id);
    setValueState(updatedValue);
    handleUpdateWorker({
      ...worker,
      specialtyIds: updatedValue.map((v) => v.id),
    });
    // Reset updating state after a brief moment to allow the update to complete
    setTimeout(() => setIsUpdating(false), 100);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      data-testid="worker-specialty-cell"
      data-updating={isUpdating}
      sx={{
        paddingY: 0,
        cursor: "pointer",
      }}
    >
      <PopoverAnchorElOver
        buttonContent={worker.specialtyIds.map((sId, index) => (
          <Chip
            key={sId}
            data-testid={`specialty-chip-${sId}`}
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
