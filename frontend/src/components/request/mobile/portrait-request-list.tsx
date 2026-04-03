import React from 'react';
import dayjs from 'dayjs';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import RequestListItem from './request-list-item';
import { RequestT } from '@/types/request';
import { ShiftT } from '@/types/shift';
import { WorkerT } from '@/types/worker';
import { ShiftWorkerOptionT } from '@/types/constraint';

type Props = {
  weeks: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  weekRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  requestsByDate: Map<string, RequestT[]>;
  periodDates: dayjs.Dayjs[];
  shifts: ShiftT[];
  workers: WorkerT[];
  shiftOptions: ShiftWorkerOptionT[];
  today: dayjs.Dayjs;
  lng: string;
  t: (key: string) => string;
  setActiveRequest: (r: RequestT) => void;
  setSheetOpen: (v: boolean) => void;
  onScroll?: () => void;
};

export default function PortraitRequestList({
  weeks,
  containerRef,
  weekRefs,
  requestsByDate,
  periodDates,
  shifts,
  workers,
  shiftOptions,
  today,
  lng,
  t,
  setActiveRequest,
  setSheetOpen,
  onScroll,
}: Props) {
  return (
    <Box
      ref={containerRef}
      onScroll={onScroll}
      sx={{
        maxHeight: 'calc(100vh - 65px)',
        overflowY: 'auto',
        pb: 8,
      }}
    >
      {weeks.map((week, wi) => {
        const weekDates: dayjs.Dayjs[] = [];
        let cur = week.start;
        while (cur.isBefore(week.end) || cur.isSame(week.end, 'day')) {
          weekDates.push(cur);
          cur = cur.add(1, 'day');
        }

        const weekItems = weekDates.flatMap(
          (d) => requestsByDate.get(d.utc().format('YYYY-MM-DD')) || [],
        );

        // Check if this week contains today
        const weekContainsToday = weekDates.some((d) => d.isSame(today, 'day'));

        // Skip week if it has no items and doesn't contain today
        if (weekItems.length === 0 && !weekContainsToday) return null;

        return (
          <Box
            key={week.start.utc().format('YYYY-MM-DD')}
            ref={(el: HTMLDivElement | null) => {
              weekRefs.current[wi] = el;
            }}
            sx={{ mb: 2 }}
          >
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle1">
                {week.start.month() === week.end.month() && week.start.year() === week.end.year()
                  ? `${week.start.format('MMMM D')} - ${week.end.format('D')}`
                  : `${week.start.format('MMMM D')} - ${week.end.format('MMMM D')}`}
              </Typography>
            </Box>

            {weekDates.map((d) => {
              const isToday = d.isSame(today, 'day');
              const key = d.utc().format('YYYY-MM-DD');
              const items = requestsByDate.get(key) || [];

              if (items.length === 0 && !isToday) return null;

              if (items.length === 0 && isToday) {
                return (
                  <Box key={key} sx={{ mb: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 64,
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#1a73e8' }}>
                          {d.format('ddd')}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: '#1a73e8',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {d.format('D')}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{t('nothing_planned')}</Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              }

              // Sort requests: by start date (earliest first), then by type (Leave before Work), then by creation date
              const sorted = [...items].sort((a: RequestT, b: RequestT) => {
                // First by start date
                if (a.startDate.isBefore(b.startDate)) return -1;
                if (a.startDate.isAfter(b.startDate)) return 1;

                // Then by type (Leave before Work)
                if (a.requestType === 'leave' && b.requestType === 'work_demand') return -1;
                if (a.requestType === 'work_demand' && b.requestType === 'leave') return 1;

                // Finally by creation date
                if (a.createdAt.isBefore(b.createdAt)) return -1;
                if (a.createdAt.isAfter(b.createdAt)) return 1;

                return 0;
              });

              return (
                <Box key={key} sx={{ mb: 1 }}>
                  {sorted.map((r: RequestT, idx: number) => {
                    const shift = r.shiftId ? shifts.find((s) => s.id === r.shiftId) || null : null;

                    return (
                      <Box
                        key={r.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: 64,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          {idx === 0 ? (
                            <>
                              <Typography
                                variant="caption"
                                sx={{ color: isToday ? '#1a73e8' : undefined }}
                              >
                                {d.format('ddd')}
                              </Typography>
                              <Typography
                                variant="h6"
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: isToday ? '50%' : undefined,
                                  backgroundColor: isToday ? '#1a73e8' : undefined,
                                  color: isToday ? '#fff' : undefined,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {d.format('D')}
                              </Typography>
                            </>
                          ) : (
                            <Box sx={{ height: 1 }} />
                          )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <RequestListItem
                            request={r}
                            shift={shift}
                            shiftOptions={shiftOptions}
                            shifts={shifts}
                            workers={workers}
                            lng={lng}
                            t={t}
                            onClick={() => {
                              setActiveRequest(r);
                              setSheetOpen(true);
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
