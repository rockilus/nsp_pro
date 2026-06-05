import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function DialogDimensionDel({
  lng,
  dimensionId,
  handleDeleteDimension,
}: {
  lng: string;
  dimensionId: string;
  handleDeleteDimension: (dimensionId: string) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [open, setOpen] = useState(false);

  const handleClickDelete = () => {
    handleDeleteDimension(dimensionId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          data-testid={`dimension-delete-button-${dimensionId}`}
          className="w-full"
        >
          {t('delete')}
        </Button>
      </DialogTrigger>
      <DialogContent data-testid={`dimension-delete-dialog-${dimensionId}`}>
        <DialogHeader>
          <DialogTitle>{t('delete_title')}</DialogTitle>
          <DialogDescription>{t('delete_text')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleClickDelete}
            data-testid={`dimension-delete-confirm-${dimensionId}`}
          >
            {t('delete_confirm')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid={`dimension-delete-cancel-${dimensionId}`}
          >
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
