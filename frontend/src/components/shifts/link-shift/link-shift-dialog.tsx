import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
// Components
import AddLinkShift from './add-link-shift';
import LinkShiftList from './link-shift-list';
import TableAddButton from '../../buttons/table-add-button';
// Styles
import '../../../styles/text-styles.css';
// Types
import { LinkShiftT, ShiftT } from '../../../types/shift';

dayjs.extend(utc);

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
}));

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

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setShiftSelected1(null);
    setShiftSelected2(null);
  };

  return (
    <React.Fragment>
      <div className="ls-button-container">
        <TableAddButton
          text={t('link_shifts')}
          tooltip={t('link_shifts_tooltip')}
          handleClick={handleClickOpen}
          showIcon={false}
        />
      </div>
      <BootstrapDialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
        sx={{ '& .MuiDialog-paper': { maxWidth: '700px' } }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
          <span className="title">{t('link_shifts')}</span>
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={(theme) => ({
            position: 'absolute',
            right: 8,
            top: 8,
            color: theme.palette.grey[500],
          })}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent dividers>
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
        </DialogContent>
      </BootstrapDialog>
    </React.Fragment>
  );
}
