import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ShiftColorMappings } from '../../constants/constants';
import { ShiftType } from '../../types/shift';
import { AssignmentDataDictT } from '../../types/assignment';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';

export default function AssignmentOfferItem({
  data,
  showTimes = true,
  isMobile = false,
  testId,
  lng = 'en',
}: {
  data: AssignmentDataDictT;
  showTimes?: boolean;
  isMobile?: boolean;
  testId?: string;
  lng?: string;
}) {
  const shift = data.shift;
  const assignment = data.assignment;

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

  const dayjsLocale = lng === 'en' ? 'en-gb' : lng;
  const localizedDate = assignment.date?.locale
    ? assignment.date.locale(dayjsLocale)
    : assignment.date;

  const dateLabel = localizedDate?.format ? localizedDate.format('D MMM, ddd') : '';

  return (
    <Box
      sx={{
        display: isMobile ? 'flex' : 'inline-flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: 1,
        backgroundColor: mapping.background,
        color: mapping.text,
        width: isMobile ? '100%' : 'auto',
      }}
      data-testid={testId ?? `assignment-offer-item-${data.assignment.id}`}
    >
      {/* Duty accent */}
      <Box
        sx={{
          width: 6,
          height: 40,
          borderRadius: 1,
          backgroundColor: shift?.shiftType === ShiftType.DUTY ? mapping.sample : 'transparent',
        }}
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'nowrap',
          mr: '14px',
        }}
      >
        {' '}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {shift?.name || '—'}
        </Typography>{' '}
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
          ⋅
        </Typography>
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {dateLabel}
        </Typography>
        {showTimes && (
          <>
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
              ⋅
            </Typography>
            <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
              {startTime && endTime ? (
                <>
                  {startTime} - {endTime}
                  {endsNextDay && <sup>+1</sup>}
                </>
              ) : (
                ''
              )}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
