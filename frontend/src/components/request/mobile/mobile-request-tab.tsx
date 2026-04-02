import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import NoWorkerAssigned from '../../common/NoWorkerAssigned';
// Hooks
import {
  useMobileRequestViewSettings,
  getDefaultRequestViewSettings,
} from '../../../app/lib/hooks/useMobileRequestViewSettings';
import { useUserWorker } from '../../../hooks/useUserWorker';
// Types
import { RequestT } from '../../../types/request';
import { ShiftT } from '../../../types/shift';
import { WorkerT } from '../../../types/worker';
import { TeamMembershipRole } from '@/types/team';
import { ShiftWorkerOptionT } from '@/types/constraint';
// Local components
import MobileNavAppBar from '../../app-bar/mobile-nav-app-bar';
import MobileRequestNav from './mobile-request-nav';
import MobileRequestSettings from './mobile-request-settings';
import PortraitRequestList from './portrait-request-list';
import RequestPanel from '../request-panel';
import { useGetRequestDeadline } from '../../../hooks/useSchedule';

dayjs.extend(utc);
dayjs.extend(isoWeek);

interface MobileRequestTabProps {
  lng: string;
  teamId: string;
  userId: string;
  userTeamRole: TeamMembershipRole;
  requests: RequestT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  isLoading: boolean;
  handleAddRequest: (request: RequestT) => Promise<void>;
  handleUpdateRequest: (request: RequestT) => Promise<void>;
  handleDeleteRequest: (requestId: string) => Promise<void>;
  handleRescindRequest: (requestId: string) => Promise<void>;
  handleAcceptRequest: (requestId: string) => Promise<void>;
  handleDenyRequest: (requestId: string) => Promise<void>;
}

export default function MobileRequestTab({
  lng,
  teamId,
  userId,
  userTeamRole,
  requests,
  workers,
  shifts,
  shiftOptions,
  isLoading,
  handleAddRequest,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
}: MobileRequestTabProps) {
  const { t } = useTranslation(lng, 'request-page');

  const defaultSettings = getDefaultRequestViewSettings();
  const [requestViewSettings, updateRequestViewSettings] = useMobileRequestViewSettings(
    teamId,
    defaultSettings,
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<RequestT | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<string>('');
  const [deadlineBannerDate, setDeadlineBannerDate] = useState<dayjs.Dayjs | null>(null);

  const getRequestDeadline = useGetRequestDeadline(teamId);

  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        const result = await getRequestDeadline();
        if (result.deadlineDate && result.deadlineDate.isAfter(dayjs().utc())) {
          setDeadlineBannerDate(result.deadlineDate);
        } else {
          setDeadlineBannerDate(null);
        }
      } catch {
        // Fail silently
      }
    };
    fetchDeadline();
  }, [getRequestDeadline]);

  // Fetch user's worker for role-based filtering (cached via React Query)
  const { data: userWorker, isLoading: isLoadingUserWorker } = useUserWorker(
    teamId,
    userTeamRole === TeamMembershipRole.MEMBER, // Only fetch for members
  );

  // Check if member has no worker association
  const memberHasNoWorker =
    userTeamRole === TeamMembershipRole.MEMBER && !isLoadingUserWorker && userWorker === null;

  // Scroll handler refs - define early so they're available for scroll functions
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const weekRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  // Ref to store the scrollToToday handler from child component
  const scrollToTodayRef = React.useRef<(() => void) | null>(null);

  // Initialize default worker if none selected
  useEffect(() => {
    // Check if member has no worker association
    if (memberHasNoWorker) {
      return;
    }

    if (
      workers.length > 0 &&
      (!requestViewSettings.mobileSelectedWorkerId ||
        !workers.find((w) => w.id === requestViewSettings.mobileSelectedWorkerId))
    ) {
      // Try to preselect user's worker
      const defaultWorkerId = (userWorker && userWorker.id) || workers[0].id;
      updateRequestViewSettings({
        mobileSelectedWorkerId: defaultWorkerId,
      });
    }
  }, [
    workers,
    requestViewSettings.mobileSelectedWorkerId,
    userWorker,
    updateRequestViewSettings,
    memberHasNoWorker,
    t,
  ]);

  // Filter requests by selected worker and past/future
  const filteredRequests = useMemo(() => {
    if (!requestViewSettings.mobileSelectedWorkerId) return [];

    const now = dayjs().utc();
    return requests.filter((r) => {
      // Filter by selected worker
      if (r.workerId !== requestViewSettings.mobileSelectedWorkerId) return false;

      // Filter by past/future if needed
      if (!requestViewSettings.showPastRequests) {
        // Only show current/future requests (endDate is today or in the future)
        return !r.endDate.isBefore(now, 'day');
      }

      return true;
    });
  }, [requests, requestViewSettings.mobileSelectedWorkerId, requestViewSettings.showPastRequests]);

  // Build weeks around current period (similar to schedule)
  const weeks = useMemo(() => {
    const center = dayjs.utc().startOf('isoWeek');
    const result: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
    const range = 8; // weeks before and after
    for (let i = -range; i <= range; i++) {
      const start = center.add(i, 'week');
      const end = start.add(6, 'day');
      result.push({ start, end });
    }
    return result;
  }, []);

  const today = dayjs.utc();

  // Build map of requests by date (multi-day requests appear on all days)
  const requestsByDate = useMemo(() => {
    const map = new Map<string, RequestT[]>();

    for (const request of filteredRequests) {
      // Add request to all dates in its range
      let currentDate = request.startDate;
      while (
        currentDate.isBefore(request.endDate, 'day') ||
        currentDate.isSame(request.endDate, 'day')
      ) {
        const key = currentDate.utc().format('YYYY-MM-DD');
        const arr = map.get(key) || [];
        arr.push(request);
        map.set(key, arr);
        currentDate = currentDate.add(1, 'day');
      }
    }

    return map;
  }, [filteredRequests]);

  // Initialize visibleMonth based on today (only on mount)
  const hasInitializedMonthRef = React.useRef(false);
  React.useEffect(() => {
    if (hasInitializedMonthRef.current) return;
    const monthLabel = today.format(today.year() === dayjs.utc().year() ? 'MMMM' : 'MMM YYYY');
    setVisibleMonth(monthLabel);
    hasInitializedMonthRef.current = true;
  }, [today]);

  // Handle "scroll to today" button click
  const handleScrollToToday = () => {
    if (scrollToTodayRef.current) {
      scrollToTodayRef.current();
    }
  };

  // Build mobile navigation content
  const requestMobileNav = (
    <MobileRequestNav
      visibleMonth={visibleMonth}
      onSettingsClick={() => setSettingsOpen(true)}
      onTodayClick={handleScrollToToday}
      lng={lng}
    />
  );

  // Detect visible month on scroll
  const handleScroll = () => {
    if (!containerRef.current) return;

    const containerTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;
    const viewportCenter = containerTop + containerHeight / 2;

    // Find which week is in the center of the viewport
    for (let i = 0; i < weekRefs.current.length; i++) {
      const weekEl = weekRefs.current[i];
      if (!weekEl) continue;

      const weekTop = weekEl.offsetTop;
      const weekBottom = weekTop + weekEl.clientHeight;

      if (viewportCenter >= weekTop && viewportCenter <= weekBottom) {
        const week = weeks[i];
        if (week) {
          const monthLabel = week.start.format(
            week.start.year() === dayjs.utc().year() ? 'MMMM' : 'MMM YYYY',
          );
          setVisibleMonth(monthLabel);
        }
        break;
      }
    }
  };

  // Scroll to today functionality
  React.useEffect(() => {
    const scrollToToday = () => {
      if (!containerRef.current) return;

      // Find the week containing today
      const todayWeekIndex = weeks.findIndex(
        (w) =>
          (today.isAfter(w.start, 'day') || today.isSame(w.start, 'day')) &&
          (today.isBefore(w.end, 'day') || today.isSame(w.end, 'day')),
      );

      if (todayWeekIndex >= 0 && weekRefs.current[todayWeekIndex]) {
        const weekEl = weekRefs.current[todayWeekIndex];
        if (weekEl) {
          weekEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    scrollToTodayRef.current = scrollToToday;
  }, [weeks, today]);

  if (isLoading) {
    return (
      <>
        <MobileNavAppBar lng={lng} mobileContent={requestMobileNav} />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  const selectedWorker = workers.find((w) => w.id === requestViewSettings.mobileSelectedWorkerId);

  return (
    <Box data-testid="mobile-request-tab">
      <MobileNavAppBar lng={lng} mobileContent={requestMobileNav} />
      {memberHasNoWorker ? (
        <NoWorkerAssigned message={t('error_no_worker_assigned')} minHeight="calc(100vh - 128px)" />
      ) : (
        <Box sx={{ padding: '0 8px', height: 'calc(100vh - 64px)' }}>
          {deadlineBannerDate && (
            <Alert severity="info" sx={{ mb: 1 }} data-testid="request-deadline-banner">
              {t('request_deadline_banner', {
                date: deadlineBannerDate.format('MMM D, YYYY HH:mm'),
              })}
            </Alert>
          )}
          <PortraitRequestList
            weeks={weeks}
            containerRef={containerRef}
            weekRefs={weekRefs}
            requestsByDate={requestsByDate}
            periodDates={[]}
            shifts={shifts}
            workers={workers}
            shiftOptions={shiftOptions}
            today={today}
            lng={lng}
            t={t}
            setActiveRequest={setActiveRequest}
            setSheetOpen={setSheetOpen}
            onScroll={handleScroll}
          />

          <Fab
            color="primary"
            aria-label="create-request"
            data-testid="mobile-add-request-fab"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => {
              setActiveRequest(null);
              setSheetOpen(true);
            }}
          >
            <AddIcon />
          </Fab>

          {/* Request Dialog - Full screen on mobile */}
          <RequestPanel
            lng={lng}
            teamId={teamId}
            isEdit={!!activeRequest}
            request={activeRequest}
            workers={workers.filter((w) => !w.deleted)}
            shifts={shifts}
            shiftOptions={shiftOptions}
            userWorkerId={userWorker?.id || null}
            userTeamRole={userTeamRole}
            handleAddRequest={handleAddRequest}
            handleUpdateRequest={handleUpdateRequest}
            handleDeleteRequest={handleDeleteRequest}
            handleRescindRequest={handleRescindRequest}
            handleAcceptRequest={handleAcceptRequest}
            handleDenyRequest={handleDenyRequest}
            hideButton={true}
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
          />

          <MobileRequestSettings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            workers={workers}
            selectedWorkerId={requestViewSettings.mobileSelectedWorkerId}
            onWorkerChange={(workerId) =>
              updateRequestViewSettings({ mobileSelectedWorkerId: workerId })
            }
            showPastRequests={requestViewSettings.showPastRequests}
            onShowPastRequestsChange={(show) =>
              updateRequestViewSettings({ showPastRequests: show })
            }
            lng={lng}
          />
        </Box>
      )}
    </Box>
  );
}
