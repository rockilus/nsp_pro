import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
// Components
import WorkerSpecialtyCellEdit from './worker-specialty-cell-edit';
import PopoverAnchorElOver from '../../../inputs/popover-anchor-el-over';
// Types
import { SpecialtyT } from '@/types/specialty';
import { WorkerT } from '../../../../types/worker';

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
    setTimeout(() => setIsUpdating(false), 100);
  };

  return (
    <td
      className="cursor-pointer py-0"
      data-testid="worker-specialty-cell"
      data-updating={isUpdating}
    >
      <PopoverAnchorElOver
        buttonContent={worker.specialtyIds.map((sId, index) => (
          <Badge
            key={sId}
            variant="outline"
            className="cursor-pointer"
            data-testid={`specialty-chip-${sId}`}
          >
            {specialties.find((s) => s.id === sId)?.name || ''}
          </Badge>
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
    </td>
  );
}
