import * as React from 'react';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
// MUI
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
// Types
import { BreachT } from '@/types/breach';

dayjs.extend(minMax);

export default function BreachItem({ breach }: { breach: BreachT }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        borderBottom: '0.5px solid lightgrey',
        padding: '5px 0',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontWeight: 400,
          fontSize: '0.875rem',
          lineHeight: '1.4',
          letterSpacing: '0.001rem',
          margin: '0',
          padding: '0 5px 0 0',
        }}
      >
        {breach.description}
      </span>
      <FiberManualRecordIcon sx={{ color: breach.hardToSoft ? 'red' : 'orange' }} />
    </div>
  );
}
