import React from 'react';
import dayjs from 'dayjs';
// MUI
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { grey } from '@mui/material/colors';
// Types and constants
import { ShiftColorMappings } from '../../../constants/constants';
import { ShiftType } from '@/types/shift';

interface TeamAssignmentItemProps {
  assignment: any;
  worker: any;
  shift: any;
  onClick?: () => void;
}

export default function TeamAssignmentItem({
  assignment,
  worker,
  shift,
  onClick,
}: TeamAssignmentItemProps) {
  const mapping = (shift && ShiftColorMappings[shift.color]) || {
    background: '#f5f5f5',
    sample: '#9e9e9e',
    text: '#212121',
  };

  const startTime = shift?.startTime?.format ? shift.startTime.format('HH:mm') : '';
  const endTime = shift?.endTime?.format ? shift.endTime.format('HH:mm') : '';
  const endsNextDay =
    shift && shift.startTime && shift.endTime
      ? !shift.endTime.isSame(shift.startTime, 'day')
      : false;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 2,
        borderRadius: 1,
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        transition: 'background-color 0.2s',
        '&:hover': {
          backgroundColor: '#f5f5f5',
        },
      }}
    >
      {/* First Row: Avatar + Name + Time */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: grey[400],
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {worker?.acronym || '?'}
        </Avatar>

        <Typography variant="body1" sx={{ fontWeight: 500, flex: 1 }}>
          {worker?.name || 'Unknown Worker'}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {startTime && endTime ? (
            <>
              {startTime} - {endTime}
              {endsNextDay && <sup>+1</sup>}
            </>
          ) : (
            ''
          )}
        </Typography>
      </Box>

      {/* Second Row: Shift Chip aligned with Avatar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: '26px' }}>
        {/* Duty marker */}
        <Box
          sx={{
            width: 6,
            height: 28,
            borderRadius: 1,
            backgroundColor: shift?.shiftType === ShiftType.DUTY ? mapping.sample : 'transparent',
          }}
        />
        <Chip
          label={shift?.name || '—'}
          size="small"
          sx={{
            backgroundColor: mapping.background,
            color: mapping.text,
            fontWeight: 500,
            fontSize: '0.9rem',
          }}
        />
      </Box>
    </Box>
  );
}
