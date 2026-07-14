import React from 'react';
import { Trash2, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
                <span className="ls-item-name">{shift?.name || 'Unknown shift'}</span>
                <span className="ls-item-times">
                  {shift
                    ? `${shift.startTime.format('HH:mm')} - ${shift.endTime.format('HH:mm')}`
                    : ''}
                </span>
              </div>
              {index < linkShift.shiftIds.length - 1 && (
                <ArrowLeftRight className="mx-1 size-4 text-gray-500" />
              )}
            </React.Fragment>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteLinkShift(linkShift.id)}
            aria-label="delete"
            className="ml-2.5"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default LinkShiftList;
