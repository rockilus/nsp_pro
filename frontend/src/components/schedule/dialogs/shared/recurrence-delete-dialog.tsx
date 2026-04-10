import React, { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button,
} from '@mui/material';
import { RecurrenceUpdateScope } from '../../../../types/recurrence';

interface RecurrenceDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: RecurrenceUpdateScope) => void;
}

const RecurrenceDeleteDialog: React.FC<RecurrenceDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [selectedScope, setSelectedScope] = useState<RecurrenceUpdateScope>(
    RecurrenceUpdateScope.SINGLE,
  );

  const handleConfirm = () => {
    onConfirm(selectedScope);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete Recurrence</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset">
          <RadioGroup
            value={selectedScope}
            onChange={(e) => setSelectedScope(Number(e.target.value) as RecurrenceUpdateScope)}
          >
            <FormControlLabel
              value={RecurrenceUpdateScope.SINGLE}
              control={<Radio data-testid="delete-this-only-radio" />}
              label="This occurrence"
            />
            <FormControlLabel
              value={RecurrenceUpdateScope.FUTURE}
              control={<Radio data-testid="delete-this-and-future-radio" />}
              label="This and following occurrences"
            />
            <FormControlLabel
              value={RecurrenceUpdateScope.ALL}
              control={<Radio data-testid="delete-all-radio" />}
              label="All occurrences"
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" data-testid="recurrence-delete-cancel-button">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="primary"
          data-testid="recurrence-delete-confirm-button"
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecurrenceDeleteDialog;
