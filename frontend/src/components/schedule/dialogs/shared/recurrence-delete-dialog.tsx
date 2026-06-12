import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
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
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Recurrence</DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={String(selectedScope)}
          onValueChange={(value) => setSelectedScope(Number(value) as RecurrenceUpdateScope)}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value={String(RecurrenceUpdateScope.SINGLE)}
              id="scope-single"
              data-testid="delete-this-only-radio"
            />
            <Label htmlFor="scope-single">This occurrence</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value={String(RecurrenceUpdateScope.FUTURE)}
              id="scope-future"
              data-testid="delete-this-and-future-radio"
            />
            <Label htmlFor="scope-future">This and following occurrences</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value={String(RecurrenceUpdateScope.ALL)}
              id="scope-all"
              data-testid="delete-all-radio"
            />
            <Label htmlFor="scope-all">All occurrences</Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="recurrence-delete-cancel-button">
            Cancel
          </Button>
          <Button onClick={handleConfirm} data-testid="recurrence-delete-confirm-button">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecurrenceDeleteDialog;
