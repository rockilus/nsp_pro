import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../../../app/i18n/client';
// MUI
import Popover from '@mui/material/Popover';
import TableCell from '@mui/material/TableCell';
// Styles
import './demands-header-cell.css';
import '../../../../styles/text-styles.css';
// Types
import { periodDateT, ScheduleViewSettingsT } from '../../../../types/schedule';
import { ShiftT, ShiftType } from '../../../../types/shift';

dayjs.extend(utc);

type CountsT = {
  [id: string]: {
    actual: number;
    target: number;
    staffingTotal: number;
  };
  total: {
    actual: number;
    target: number;
    staffingTotal: number;
  };
};

const DSDPopoverButton: React.FC<{ counts: CountsT }> = ({ counts }) => {
  return (
    <span
      className={`dsd-stats-total ${counts.total.actual !== counts.total.target ? 'breach' : ''}`}
    >
      {`${counts.total.actual} / ${counts.total.target}`}
    </span>
  );
};

const PopoverContent: React.FC<{
  shiftsWorkNotDeleted: ShiftT[];
  counts: CountsT;
  scheduleViewSettings: ScheduleViewSettingsT;
  t: (key: string) => string;
}> = ({ shiftsWorkNotDeleted, counts, scheduleViewSettings, t }) => {
  return (
    <div>
      <span className="subtitle">
        {scheduleViewSettings.groupBy === 'shift' ? t('shift_count') : t('worker_count')}
      </span>
      <div className="divider-popover" />
      {shiftsWorkNotDeleted.map((shift) => {
        return (
          <div key={shift.id} className="container-dsd-item">
            <div
              className={`container-dsd-item-text ${
                counts[shift.id].actual !== counts[shift.id].target ? 'breach' : ''
              }`}
            >
              <div className="shift-name">{shift.name}</div>
              {scheduleViewSettings.groupBy === 'worker' && (
                <span className="dsd-stats staffing-count">{`(${
                  counts[shift.id].staffingTotal
                })`}</span>
              )}
              <div className="container-dsd-stats">
                <span className="dsd-stats dsd-stats-actual">{counts[shift.id].actual}</span>
                <span className="dsd-stats dsd-stats-slash">/</span>
                <span className="dsd-stats dsd-stats-target">{counts[shift.id].target}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function DemandsHeaderCell({
  lng,
  shifts,
  counts,
  scheduleViewSettings,
}: {
  lng: string;
  shifts: ShiftT[];
  counts: {
    [id: string]: {
      actual: number;
      target: number;
      staffingTotal: number;
    };
    total: {
      actual: number;
      target: number;
      staffingTotal: number;
    };
  };
  scheduleViewSettings: ScheduleViewSettingsT;
}) {
  const { t } = useTranslation(lng, 'schedule-page');

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const shiftsWorkNotDeleted = useMemo(() => {
    return shifts.filter(
      (s) => [ShiftType.NORMAL, ShiftType.DUTY].includes(s.shiftType) && !s.deleted,
    );
  }, [shifts]);

  return (
    <TableCell
      sx={{
        padding: 0,
        borderRight: '1px solid #e0e0e07d',
      }}
    >
      <div className="container-dsd-cell">
        <button type="button" onClick={handleClick} className="dsd-popover-button">
          <DSDPopoverButton counts={counts} />
        </button>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          slotProps={{
            paper: {
              style: {
                boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)',
                padding: 20,
                width: 300,
              },
            },
          }}
        >
          <PopoverContent
            shiftsWorkNotDeleted={shiftsWorkNotDeleted}
            counts={counts}
            scheduleViewSettings={scheduleViewSettings}
            t={t}
          />
        </Popover>
      </div>
    </TableCell>
  );
}
