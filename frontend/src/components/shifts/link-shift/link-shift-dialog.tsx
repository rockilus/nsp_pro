import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../app/i18n/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// Components
import AddLinkShift from './add-link-shift';
import LinkShiftList from './link-shift-list';
import TableAddButton from '../../buttons/table-add-button';
// Styles
import '../../../styles/text-styles.css';
// Types
import { LinkShiftT, ShiftT } from '../../../types/shift';

dayjs.extend(utc);

export default function LinkShiftDialog({
  lng,
  teamId,
  shifts,
  linkShifts,
  handleAddLinkShift,
  handleDeleteLinkShift,
}: {
  lng: string;
  teamId: string;
  shifts: ShiftT[];
  linkShifts: LinkShiftT[];
  handleAddLinkShift: (linkShift: LinkShiftT) => void;
  handleDeleteLinkShift: (linkShiftId: string) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [open, setOpen] = useState(false);
  const [shiftSelected1, setShiftSelected1] = useState<ShiftT | null>(null);
  const [shiftSelected2, setShiftSelected2] = useState<ShiftT | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setShiftSelected1(null);
      setShiftSelected2(null);
    }
  };

  return (
    <React.Fragment>
      <div className="ls-button-container">
        <TableAddButton
          text={t('link_shifts')}
          tooltip={t('link_shifts_tooltip')}
          handleClick={() => setOpen(true)}
          showIcon={false}
        />
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[850px] sm:max-w-[850px] overflow-hidden" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="title">{t('link_shifts')}</DialogTitle>
          </DialogHeader>
          <div className="border-t overflow-hidden pt-4">
            <AddLinkShift
              lng={lng}
              teamId={teamId}
              shifts={shifts}
              linkShifts={linkShifts}
              shiftSelected1={shiftSelected1}
              shiftSelected2={shiftSelected2}
              setShiftSelected1={setShiftSelected1}
              setShiftSelected2={setShiftSelected2}
              handleAddLinkShift={handleAddLinkShift}
            />
            <LinkShiftList
              linkShifts={linkShifts}
              shifts={shifts}
              handleDeleteLinkShift={handleDeleteLinkShift}
            />
          </div>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
