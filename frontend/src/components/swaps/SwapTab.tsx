'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  Container,
  Fab,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { SwapRequestT, SwapStatus, SwapType } from '../../types/swap';
import { SwapValidationResultT } from '../../types/swapValidation';
import { WorkerT } from '../../types/worker';
import { ShiftT } from '../../types/shift';
import { LinkShiftT } from '../../types/shift';
import { AssignmentDataDictT } from '../../types/assignment';
import CreateSwapDialog from './CreateSwapDialog';
import SwapDetailDialog from './SwapDetailDialog';
import SwapCard from './SwapCard';
import SwapAnalysisDialog from './SwapAnalysisDialog';
import { TeamWithMembership, TeamMembershipRole } from '../../types/team';
import { useGetWorkers } from '../../hooks/useWorker';
import { useGetShifts } from '../../hooks/useShift';
import { useGetLinkShifts } from '../../hooks/useLinkShift';
import {
  useAssignmentsByPeriod,
  useAssignmentsQueryClient,
} from '../../app/lib/hooks/useAssignments';
import {
  useGetSwaps,
  useGetSwapById,
  useCreateSwap,
  useAddBid,
  useDeleteBid,
  useAcceptBid,
  useCancelBidAcceptance,
  useAcceptDirectSwap,
  useApproveSwap,
  useDeleteSwap,
  useDenySwap,
  useRevertSwap,
  useValidateSwap,
} from '../../hooks/useSwap';
import { useTranslation } from '../../app/i18n/client';
import { useUserWorker } from '../../hooks/useUserWorker';
import { useIsMobile } from '../../hooks/useIsMobile';
import MobileNavAppBar from '../app-bar/mobile-nav-app-bar';
import NoWorkerAssigned from '../common/NoWorkerAssigned';
import {
  sortAssignmentsByDateThenShiftStart,
  sortItemsByEarliestAssignment,
} from '../../utils/assignmentSort';
import { getWorkerByUserId } from '../../utils/workerHelpers';
// Styles
import '../../styles/text-styles.css';

enum SwapFilter {
  ALL_ACTIVE_OPEN = 'all_active_open',
  MY_SWAPS = 'my_swaps',
  PENDING_APPROVAL = 'pending_approval',
  COMPLETED = 'completed',
  ALL_SWAPS = 'all_swaps',
}

const filterLabels: Record<SwapFilter, string> = {
  [SwapFilter.ALL_ACTIVE_OPEN]: 'Open swaps',
  [SwapFilter.MY_SWAPS]: 'My swaps',
  [SwapFilter.PENDING_APPROVAL]: 'Pending approval',
  [SwapFilter.COMPLETED]: 'Completed',
  [SwapFilter.ALL_SWAPS]: 'All swaps',
};

// Centralized tab definitions
interface SwapTabDefinition {
  label: string;
  value: SwapFilter;
  dataTestId: string;
  visibleFor?: 'all' | 'leader' | 'member';
  sx?: Record<string, any>;
}

const SWAP_TABS: SwapTabDefinition[] = [
  {
    label: filterLabels[SwapFilter.ALL_ACTIVE_OPEN],
    value: SwapFilter.ALL_ACTIVE_OPEN,
    dataTestId: 'filter-all-active-open',
    visibleFor: 'all',
    sx: { textTransform: 'none' },
  },
  {
    label: filterLabels[SwapFilter.MY_SWAPS],
    value: SwapFilter.MY_SWAPS,
    dataTestId: 'filter-my-swaps',
    visibleFor: 'all',
    sx: { textTransform: 'none' },
  },
  {
    label: filterLabels[SwapFilter.PENDING_APPROVAL],
    value: SwapFilter.PENDING_APPROVAL,
    dataTestId: 'filter-pending-approval',
    visibleFor: 'leader',
    sx: { textTransform: 'none' },
  },
  {
    label: filterLabels[SwapFilter.COMPLETED],
    value: SwapFilter.COMPLETED,
    dataTestId: 'filter-completed',
    visibleFor: 'leader',
    sx: { textTransform: 'none' },
  },
  {
    label: filterLabels[SwapFilter.ALL_SWAPS],
    value: SwapFilter.ALL_SWAPS,
    dataTestId: 'filter-all-swaps',
    visibleFor: 'leader',
    sx: { textTransform: 'none' },
  },
];

interface SwapTabProps {
  teamWithMembership: TeamWithMembership;
  currentUserId: string;
  lng: string;
}

export default function SwapTab({ teamWithMembership, currentUserId, lng }: SwapTabProps) {
  const teamId = teamWithMembership.team.id;
  const isMobile = useIsMobile();
  const { t } = useTranslation(lng, 'swap-page');

  // Fetch user's worker for role-based checks (only for members)
  const { data: userWorker, isLoading: isLoadingUserWorker } = useUserWorker(
    teamId,
    teamWithMembership.membership.role === TeamMembershipRole.MEMBER,
  );

  // Check if member has no worker association
  const memberHasNoWorker =
    teamWithMembership.membership.role === TeamMembershipRole.MEMBER &&
    !isLoadingUserWorker &&
    userWorker === null;

  // React Query hook for assignments with smart caching
  const {
    assignments: rawAssignments,
    recurrences,
    isLoading: isLoadingAssignments,
    isFetching: isFetchingAssignments,
    error: assignmentsError,
  } = useAssignmentsByPeriod(
    teamId,
    dayjs.utc().add(1, 'day').startOf('day'), // Tomorrow onwards
    dayjs.utc().add(6, 'month'), // 6 months ahead (reasonable limit for swaps)
    false, // includeCampaign - swaps don't show campaign assignments
    undefined, // no worker filter for desktop view
    { enabled: !!teamId && !memberHasNoWorker },
    [0, 1], // only NORMAL and DUTY shifts are relevant for swaps
  );

  // Query client for manual cache operations
  const { invalidateAssignments } = useAssignmentsQueryClient();

  // Hooks
  const getSwaps = useGetSwaps();
  const getSwapById = useGetSwapById();
  const createSwap = useCreateSwap();
  const addBid = useAddBid();
  const deleteBid = useDeleteBid();
  const acceptBid = useAcceptBid();
  const cancelBidAcceptance = useCancelBidAcceptance();
  const acceptDirectSwap = useAcceptDirectSwap();
  const approveSwap = useApproveSwap();
  const deleteSwap = useDeleteSwap();
  const denySwap = useDenySwap();
  const revertSwap = useRevertSwap();
  const validateSwap = useValidateSwap();
  const getWorkers = useGetWorkers();
  const getShifts = useGetShifts();
  const getLinkShifts = useGetLinkShifts();

  const [currentFilter, setCurrentFilter] = useState<SwapFilter>(SwapFilter.ALL_ACTIVE_OPEN);
  const [swaps, setSwaps] = useState<SwapRequestT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [linkShifts, setLinkShifts] = useState<LinkShiftT[]>([]);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<SwapRequestT | null>(null);

  // Swap analysis states
  const [validationResult, setValidationResult] = useState<SwapValidationResultT | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);

  // Check if user is a leader
  const isLeader = teamWithMembership.membership.role === 'owner';

  // Get current user's worker
  const currentUserWorker = getWorkerByUserId(currentUserId, workers);

  // Derive enriched assignments from React Query data
  const assignments = useMemo(() => {
    const buildAssignmentDataDict = (
      assignmentsRead: any[],
      workersData: WorkerT[],
      shiftsData: ShiftT[],
    ): AssignmentDataDictT[] => {
      const shiftMap = new Map(shiftsData.map((shift) => [shift.id, shift]));
      const workerMap = new Map(workersData.map((worker) => [worker.id, worker]));

      return assignmentsRead.map((assignment) => ({
        assignment,
        worker: workerMap.get(assignment.workerId) || ({} as WorkerT),
        shift: shiftMap.get(assignment.shiftId) || ({} as ShiftT),
        recurrence: null,
        breaches: [],
        requests: [],
      }));
    };

    return sortAssignmentsByDateThenShiftStart(
      buildAssignmentDataDict(rawAssignments, workers, shifts),
    );
  }, [rawAssignments, workers, shifts]);

  const loadInitialData = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      // Load workers, shifts, and link shifts (assignments come from React Query)
      const [workersData, shiftsData, linkShiftsData] = await Promise.all([
        getWorkers(teamId),
        getShifts(teamId),
        getLinkShifts(teamId),
      ]);

      setWorkers(workersData);
      setShifts(shiftsData);
      setLinkShifts(linkShiftsData);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [teamId, getWorkers, getShifts, getLinkShifts]);

  const loadSwaps = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);
      // Fetch all swaps, filtering will be done client-side
      const data = await getSwaps(teamId);
      setSwaps(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load swaps');
    } finally {
      setLoading(false);
    }
  }, [teamId, getSwaps]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load swaps when tab changes
  useEffect(() => {
    loadSwaps();
  }, [loadSwaps]);

  const handleFilterChange = (_event: React.SyntheticEvent, newFilter: SwapFilter) => {
    setCurrentFilter(newFilter);
  };

  const filteredSwaps = useMemo(() => {
    return swaps.filter((swap) => {
      switch (currentFilter) {
        case SwapFilter.ALL_ACTIVE_OPEN:
          // Active open swaps, excluding my own, including those I bid on
          return (
            swap.swapType === SwapType.OPEN &&
            swap.status === SwapStatus.ACTIVE &&
            swap.offeringWorkerId !== currentUserWorker?.id
          );

        case SwapFilter.MY_SWAPS:
          // Swaps I created OR direct swaps targeting me OR open swaps where my bid was accepted
          return (
            swap.offeringWorkerId === currentUserWorker?.id ||
            (swap.swapType === SwapType.DIRECT &&
              currentUserWorker &&
              swap.targetWorkerId === currentUserWorker.id) ||
            (swap.swapType === SwapType.OPEN &&
              currentUserWorker &&
              swap.bids.some((bid) => bid.workerId === currentUserWorker.id && bid.accepted))
          );

        case SwapFilter.PENDING_APPROVAL:
          // Swaps pending approval (leader only)
          return swap.status === SwapStatus.PENDING_APPROVAL;

        case SwapFilter.COMPLETED:
          // Completed swaps (leader only)
          return swap.status === SwapStatus.COMPLETED;

        case SwapFilter.ALL_SWAPS:
          // All swaps (leader only)
          return true;

        default:
          return true;
      }
    });
  }, [swaps, currentFilter, currentUserWorker]);

  // Pre-compute enriched swap data with assignments and creator info
  const enrichedSwaps = useMemo(() => {
    return filteredSwaps.map((swap) => {
      const offeredAssignments = sortAssignmentsByDateThenShiftStart(
        assignments.filter((a) => swap.offeredAssignmentIds.includes(a.assignment.id)),
      );

      const requestedAssignments = swap.requestedAssignmentIds
        ? sortAssignmentsByDateThenShiftStart(
            assignments.filter((a) => swap.requestedAssignmentIds!.includes(a.assignment.id)),
          )
        : [];

      // Find the creator worker from the first offered assignment
      const creatorWorker =
        offeredAssignments.length > 0
          ? offeredAssignments[0].worker
          : workers.find((w) => w.userId === swap.createdByUserId) || null;

      return {
        swap,
        offeredAssignments,
        requestedAssignments,
        creatorWorker,
      };
    });
  }, [filteredSwaps, assignments, workers]);

  const sortedEnrichedSwaps = useMemo(
    () =>
      sortItemsByEarliestAssignment(
        enrichedSwaps,
        (e) => e.offeredAssignments,
        (e) => e.swap.createdAt as any,
      ),
    [enrichedSwaps],
  );

  const handleCreateSwap = async (swapData: {
    offeredAssignmentIds: string[];
    requestedAssignmentIds: string[] | null;
    swapType: SwapType;
    targetWorkerId: string | null;
    comment: string;
  }) => {
    if (!teamId) return;

    await createSwap(teamId, swapData);
    loadSwaps();
  };

  const handleAddBid = async (
    swapId: string,
    bidderWorkerId: string,
    bidAssignmentIds: string[],
  ) => {
    await addBid(swapId, bidderWorkerId, bidAssignmentIds);
    loadSwaps();
    // Refresh selected swap
    const updatedSwap = await getSwapById(swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleAcceptBid = async (swapId: string, bidId: string) => {
    await acceptBid(swapId, bidId);
    loadSwaps();
    const updatedSwap = await getSwapById(swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleDeleteBid = async (swapId: string, bidId: string) => {
    // Optimistically update UI: remove the bid from local state
    setSwaps((prev) =>
      prev.map((s) => (s.id === swapId ? { ...s, bids: s.bids.filter((b) => b.id !== bidId) } : s)),
    );

    setSelectedSwap((prev) =>
      prev ? { ...prev, bids: prev.bids.filter((b) => b.id !== bidId) } : prev,
    );

    try {
      const updatedSwap = await deleteBid(swapId, bidId);
      // If API returns the updated swap, sync local state to it
      if (updatedSwap) {
        setSelectedSwap(updatedSwap);
        setSwaps((prev) => prev.map((s) => (s.id === swapId ? updatedSwap : s)));
      } else {
        // If no payload returned, refresh swaps list in background
        loadSwaps();
      }
    } catch (err) {
      console.error('Failed to delete bid:', err);
      // Re-sync with server on error
      loadSwaps();
      try {
        const refreshed = await getSwapById(swapId);
        if (refreshed) setSelectedSwap(refreshed);
      } catch (e) {
        /* ignore */
      }
    }
  };

  const handleAcceptDirectSwap = async (swapId: string) => {
    await acceptDirectSwap(swapId);
    loadSwaps();
    const updatedSwap = await getSwapById(swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleApproveSwap = async (swapId: string) => {
    await approveSwap(swapId);
    // Invalidate assignment cache to trigger refetch
    invalidateAssignments(teamId);
    await loadSwaps();
  };

  const handleDenySwap = async (swapId: string) => {
    await denySwap(swapId);
    loadSwaps();
    const updatedSwap = await getSwapById(swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleRevertSwap = async (swapId: string) => {
    await revertSwap(swapId);
    loadSwaps();
    const updatedSwap = await getSwapById(swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleCancelBidAcceptance = async (swapId: string) => {
    await cancelBidAcceptance(swapId);
    loadSwaps();
    const updatedSwap = await getSwapById(swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleDeleteSwap = async (swapId: string) => {
    await deleteSwap(swapId);
    loadSwaps();
  };

  const handleAnalyzeSwap = async (swapId: string) => {
    setIsAnalyzing(true);
    setValidationResult(null);
    try {
      const result = await validateSwap(swapId);
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to analyze swap:', error);
      // Error will be shown in the UI via validationResult being null
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewAnalysisDetails = () => {
    setAnalysisDialogOpen(true);
  };

  const handleCloseAnalysisDialog = () => {
    setAnalysisDialogOpen(false);
  };

  const openDetailDialog = (swap: SwapRequestT) => {
    setSelectedSwap(swap);
    setDetailDialogOpen(true);
  };

  const visibleTabs = useMemo(
    () =>
      SWAP_TABS.filter(
        (tab) =>
          tab.visibleFor === 'all' ||
          (tab.visibleFor === 'leader' && isLeader) ||
          (tab.visibleFor === 'member' && !isLeader),
      ),
    [isLeader],
  );

  // Combine loading states from local data and React Query
  const isLoading = loading || isLoadingAssignments;
  const combinedError = error || (assignmentsError ? String(assignmentsError) : null);

  if (memberHasNoWorker) {
    return (
      <Box sx={{ backgroundColor: 'white', minHeight: '100vh' }}>
        {isMobile && <MobileNavAppBar lng={lng} />}
        <NoWorkerAssigned message={t('error_no_worker_assigned')} minHeight="calc(100vh - 128px)" />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {isMobile && <MobileNavAppBar lng={lng} />}
      <Container maxWidth="lg" sx={{ py: isMobile ? 0 : 3, pt: isMobile ? 1 : undefined }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {!isMobile && (
            <Typography
              component="span"
              className="title"
              role="heading"
              aria-level={1}
              sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#1976d2' }}
            >
              {t('page_title')}
            </Typography>
          )}
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              data-testid="create-swap-button"
            >
              {t('btn_create_swap')}
            </Button>
          )}
        </Box>

        <Tabs
          value={currentFilter}
          onChange={handleFilterChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          sx={{ marginBottom: '2px' }}
        >
          {visibleTabs.map((tab) => (
            <Tab
              key={tab.value}
              label={t(`filter_${tab.value}`)}
              value={tab.value}
              data-testid={tab.dataTestId}
              sx={tab.sx}
            />
          ))}
        </Tabs>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {combinedError && (
          <Typography color="error" sx={{ py: 2 }}>
            {combinedError}
          </Typography>
        )}

        {!isLoading && !combinedError && filteredSwaps.length === 0 && (
          <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {currentFilter === SwapFilter.MY_SWAPS && t('empty_my_swaps')}
            {currentFilter === SwapFilter.ALL_ACTIVE_OPEN && t('empty_open_swaps')}
            {currentFilter === SwapFilter.PENDING_APPROVAL && t('empty_pending_approval')}
            {currentFilter === SwapFilter.COMPLETED && t('empty_completed_swaps')}
            {currentFilter === SwapFilter.ALL_SWAPS && t('empty_all_swaps')}
          </Typography>
        )}

        <Box
          sx={{
            height: isMobile
              ? 'calc(100vh - 123px)' // 65px - 8px - 48px - 2px
              : 'calc(100vh - 200px)', // 65px - 24px-36.5px-48px-2px
            overflowY: 'auto',
          }}
        >
          {!isLoading &&
            !combinedError &&
            sortedEnrichedSwaps.map(({ swap, offeredAssignments, requestedAssignments }) => (
              <SwapCard
                key={swap.id}
                swap={swap}
                offeredAssignments={offeredAssignments}
                requestedAssignments={requestedAssignments}
                isMobile={isMobile}
                onClick={openDetailDialog}
                lng={lng}
              />
            ))}
        </Box>

        {/* Create Swap Dialog */}
        <CreateSwapDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateSwap}
          teamId={teamId}
          currentUserId={currentUserId}
          currentUserWorker={currentUserWorker}
          role={teamWithMembership.membership.role}
          workers={workers}
          assignments={assignments}
          linkShifts={linkShifts}
          lng={lng}
        />

        {/* Swap Detail Dialog */}
        <SwapDetailDialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          swap={selectedSwap}
          teamId={teamId}
          currentUserId={currentUserId}
          currentUserWorker={currentUserWorker}
          isLeader={isLeader}
          workers={workers}
          assignments={assignments}
          linkShifts={linkShifts}
          onAddBid={
            selectedSwap
              ? (workerId, bidIds) => handleAddBid(selectedSwap.id, workerId, bidIds)
              : undefined
          }
          onAcceptBid={
            selectedSwap ? (bidId) => handleAcceptBid(selectedSwap.id, bidId) : undefined
          }
          onDeleteBid={
            selectedSwap ? (bidId) => handleDeleteBid(selectedSwap.id, bidId) : undefined
          }
          onAcceptDirectSwap={
            selectedSwap ? () => handleAcceptDirectSwap(selectedSwap.id) : undefined
          }
          onApprove={selectedSwap ? () => handleApproveSwap(selectedSwap.id) : undefined}
          onDeny={selectedSwap ? () => handleDenySwap(selectedSwap.id) : undefined}
          onRevert={selectedSwap ? () => handleRevertSwap(selectedSwap.id) : undefined}
          onCancelBidAcceptance={
            selectedSwap ? () => handleCancelBidAcceptance(selectedSwap.id) : undefined
          }
          onDelete={selectedSwap ? () => handleDeleteSwap(selectedSwap.id) : undefined}
          onAnalyzeSwap={handleAnalyzeSwap}
          validationResult={validationResult}
          isAnalyzing={isAnalyzing}
          onViewAnalysisDetails={handleViewAnalysisDetails}
          lng={lng}
        />

        {/* Swap Analysis Dialog */}
        {validationResult && (
          <SwapAnalysisDialog
            open={analysisDialogOpen}
            onClose={handleCloseAnalysisDialog}
            validationResult={validationResult}
            assignments={assignments}
            lng={lng}
          />
        )}

        {/* FAB for mobile */}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="create swap"
            onClick={() => setCreateDialogOpen(true)}
            data-testid="create-swap-fab"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Container>
    </Box>
  );
}
