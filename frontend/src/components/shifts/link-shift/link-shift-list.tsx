import React from 'react';
// MUI
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
// Styles
import './link-shift-list.css';
// Types
import { LinkShiftT, ShiftT } from '../../../types/shift';

interface LinkShiftListProps {
  linkShifts: LinkShiftT[];
  shifts: ShiftT[];
  handleDeleteLinkShift: (linkShiftId: string) => void;
}

const LinkShiftList: React.FC<LinkShiftListProps> = ({
  linkShifts,
  shifts,
  handleDeleteLinkShift,
}) => {
  const getShiftNames = (shiftIds: string[]) => {
    return shiftIds.map((shiftId) => {
      const shift = shifts.find((s) => s.id === shiftId);
      return shift ? shift : null;
    });
  };

  return (
    <div className="link-shift-list-container">
      {linkShifts.map((linkShift) => (
        <div key={linkShift.id} className="link-shift-list-item">
          {getShiftNames(linkShift.shiftIds).map((shift, index) => (
            <React.Fragment key={index}>
              <div className="ls-item-info">
                <span className="ls-item-name">{shift?.name || 'Uknown shift'}</span>
                <span className="ls-item-times">
                  {shift
                    ? `${shift.startTime.format('HH:mm')} - ${shift.endTime.format('HH:mm')}`
                    : ''}
                </span>
              </div>
              {index < linkShift.shiftIds.length - 1 && (
                <SyncAltIcon sx={{ marginX: 1, fontSize: 16, color: 'grey' }} />
              )}
            </React.Fragment>
          ))}
          <IconButton
            onClick={() => handleDeleteLinkShift(linkShift.id)}
            aria-label="delete"
            sx={{ marginLeft: '10px' }}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      ))}
    </div>
  );
};

export default LinkShiftList;
