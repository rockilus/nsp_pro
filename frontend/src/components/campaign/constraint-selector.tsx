import React, { useState } from 'react';
import { useTranslation } from '../../app/i18n/client';
// MUI
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
// Icons
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
// Components
import MissingProperties from '../constraints/constraint-list/missing-properties';
import ConstraintPeriodDialog from './constraint-period-dialog';
// Hooks
import { useIsMobile } from '../../hooks/useIsMobile';
// Styles
import './constraint-selector.css';
import '../../styles/text-styles.css';
// Types
import { ScheduleT, PeriodT } from '../../types/schedule';
import { ConstraintT } from '../../types/constraint';

function formatPeriodDisplay(period: PeriodT): string {
  return `${period.startDate.format('MMM D, YYYY')} – ${period.endDate.format('MMM D, YYYY')}`;
}

export default function ConstraintSelector({
  lng,
  schedule,
  constraints,
  handleUpdateSchedule,
}: {
  lng: string;
  schedule: ScheduleT;
  constraints: ConstraintT[];
  handleUpdateSchedule: (schedule: ScheduleT) => void;
}) {
  const { t } = useTranslation(lng, 'campaign-page');
  const isMobile = useIsMobile();
  const [dialogOpenForId, setDialogOpenForId] = useState<string | null>(null);

  const handleUpdateScheduleConstraintIds = (constraintId: string) => {
    const updatedSchedule = {
      ...schedule,
      constraintBuildIds: schedule.constraintBuildIds.includes(constraintId)
        ? schedule.constraintBuildIds.filter((id) => id !== constraintId)
        : [...schedule.constraintBuildIds, constraintId],
    };
    handleUpdateSchedule(updatedSchedule);
  };

  const handleAddAllConstraints = () => {
    const updatedSchedule = {
      ...schedule,
      constraintBuildIds: constraints.map((c) => c.id),
    };
    handleUpdateSchedule(updatedSchedule);
  };

  const handleRemoveAllConstraints = () => {
    const updatedSchedule = {
      ...schedule,
      constraintBuildIds: [],
    };
    handleUpdateSchedule(updatedSchedule);
  };

  const handleSavePeriod = (constraintId: string, period: PeriodT | null) => {
    const updatedPeriods = { ...schedule.constraintEffectivePeriods };
    if (period) {
      updatedPeriods[constraintId] = period;
    } else {
      updatedPeriods[constraintId] = null;
    }
    handleUpdateSchedule({
      ...schedule,
      constraintEffectivePeriods: updatedPeriods,
    });
  };

  return (
    <div className="constraint-selector-container">
      <div className="title-container">
        <span className="title">{t('constraints')}</span>
        <div className="select-buttons-container">
          <button className="select-button" onClick={handleAddAllConstraints}>
            {t('select_all')}
          </button>
          <button className="select-button unselect-button" onClick={handleRemoveAllConstraints}>
            {t('select_none')}
          </button>
        </div>
      </div>
      <TableContainer>
        <Table sx={{ minWidth: isMobile ? '100%' : 650, width: '100%' }} aria-label="simple table">
          <TableBody>
            {constraints.map((constraint) => {
              const selected = schedule.constraintBuildIds.includes(constraint.id);
              const period = schedule.constraintEffectivePeriods?.[constraint.id] ?? null;
              return (
                <TableRow
                  key={constraint.id}
                  className={`constraint-row ${constraint.active ? 'active' : 'inactive'}`}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                    <div className="check-cell-container">
                      <Checkbox
                        checked={selected}
                        onChange={() => handleUpdateScheduleConstraintIds(constraint.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                    <div className="constraint-name-cell">
                      <span
                        className={constraint.active ? 'constraint-active' : 'constraint-inactive'}
                      >
                        {constraint.text}
                      </span>
                      <MissingProperties
                        lng={lng}
                        missingProperties={constraint.missingAttributes}
                      />
                      {selected && (
                        <span className="constraint-period-display">
                          {period ? formatPeriodDisplay(period) : t('entire_campaign')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right" sx={{ padding: 0, width: 48 }}>
                      <IconButton
                        size="small"
                        onClick={() => setDialogOpenForId(constraint.id)}
                        data-testid={`constraint-period-button-${constraint.id}`}
                      >
                        <CalendarMonthIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {constraints.map((constraint) => (
        <ConstraintPeriodDialog
          key={`dialog-${constraint.id}`}
          lng={lng}
          open={dialogOpenForId === constraint.id}
          onClose={() => setDialogOpenForId(null)}
          onSave={(period) => handleSavePeriod(constraint.id, period)}
          initialPeriod={schedule.constraintEffectivePeriods?.[constraint.id] ?? null}
          campaignStart={schedule.startDate}
          campaignEnd={schedule.endDate}
        />
      ))}
    </div>
  );
}
