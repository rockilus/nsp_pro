import React from 'react';
// MUI
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
// Components
import ConstraintEdit from '../edit-constraint/constraint-edit';
// Types
import { ConstraintT, TemplateT } from '../../../types/constraint';
import { WorkerT } from '../../../types/worker';
import { ShiftT } from '../../../types/shift';

export default function ConstraintButton({
  lng,
  workers,
  shifts,
  buttonElement,
  constraint,
  constraintTemplate,
  handleUpdateConstraint,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  buttonElement: React.ReactNode;
  constraint: ConstraintT;
  constraintTemplate: TemplateT | null;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
}) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Dummy function for compatibility - we only use handleUpdateConstraint in edit mode
  const handleAddConstraint = (_: ConstraintT) => {
    // This won't actually be used, since we're editing an existing constraint
    handleClose();
  };

  // Wrap the update constraint handler to close the menu after update
  const wrappedUpdateConstraint = (updatedConstraint: ConstraintT) => {
    handleUpdateConstraint(updatedConstraint);
    handleClose();
  };

  return (
    <Box style={{ width: '100%' }}>
      <Box onClick={handleClick} sx={{ display: 'inline-flex', minWidth: 0 }}>
        {buttonElement}
      </Box>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
        slotProps={{
          paper: {
            style: {
              width: '95%',
            },
          },
        }}
        data-testid="constraint-edit-popup"
      >
        <ConstraintEdit
          lng={lng}
          workers={workers}
          shifts={shifts}
          constraint={constraint}
          template={constraintTemplate}
          handleAddConstraint={handleAddConstraint}
          handleUpdateConstraint={wrappedUpdateConstraint}
        />
      </Menu>
    </Box>
  );
}
