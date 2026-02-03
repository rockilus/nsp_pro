"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Container,
  Fab,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { SwapRequestT, SwapStatus, SwapType } from "../../types/swap";
import { WorkerT } from "../../types/worker";
import { ShiftT } from "../../types/shift";
import { LinkShiftT } from "../../types/shift";
import { AssignmentDataDictT } from "../../types/assignment";
import CreateSwapDialog from "./CreateSwapDialog";
import SwapDetailDialog from "./SwapDetailDialog";
import SwapCard from "./SwapCard";
import { TeamWithMembership } from "../../types/team";
import { useGetWorkers } from "../../hooks/useWorker";
import { useGetShifts } from "../../hooks/useShift";
import { useGetLinkShifts } from "../../hooks/useLinkShift";
import { useGetAssignments } from "../../hooks/useAssignment";
import {
  useGetSwaps,
  useGetSwapById,
  useCreateSwap,
  useAddBid,
  useAcceptBid,
  useAcceptDirectSwap,
  useApproveSwap,
  useDeleteSwap,
  useDenySwap,
  useRevertSwap,
} from "../../hooks/useSwap";
import { useIsMobile } from "../../hooks/useIsMobile";
import MobileNavAppBar from "../app-bar/mobile-nav-app-bar";
// Styles
import "../../styles/text-styles.css";

enum SwapFilter {
  ALL_ACTIVE_OPEN = "all_active_open",
  DIRECT_PROPOSALS = "direct_proposals",
  MY_BIDS = "my_bids",
  MY_SWAPS = "my_swaps",
  PENDING_APPROVAL = "pending_approval",
  COMPLETED = "completed",
}

const filterLabels: Record<SwapFilter, string> = {
  [SwapFilter.ALL_ACTIVE_OPEN]: "Open swaps",
  [SwapFilter.DIRECT_PROPOSALS]: "Swap proposals",
  [SwapFilter.MY_BIDS]: "My bids",
  [SwapFilter.MY_SWAPS]: "My swaps",
  [SwapFilter.PENDING_APPROVAL]: "Pending approval",
  [SwapFilter.COMPLETED]: "Completed",
};

// Centralized tab definitions
interface SwapTabDefinition {
  label: string;
  value: SwapFilter;
  dataTestId: string;
  visibleFor?: "all" | "leader" | "member";
  sx?: Record<string, any>;
}

const SWAP_TABS: SwapTabDefinition[] = [
  {
    label: filterLabels[SwapFilter.ALL_ACTIVE_OPEN],
    value: SwapFilter.ALL_ACTIVE_OPEN,
    dataTestId: "filter-all-active-open",
    visibleFor: "all",
    sx: { textTransform: "none" },
  },
  // {
  //   label: filterLabels[SwapFilter.DIRECT_PROPOSALS],
  //   value: SwapFilter.DIRECT_PROPOSALS,
  //   dataTestId: "filter-direct-proposals",
  //   visibleFor: "all",
  //   sx: { textTransform: "none" },
  // },
  // {
  //   label: filterLabels[SwapFilter.MY_BIDS],
  //   value: SwapFilter.MY_BIDS,
  //   dataTestId: "filter-my-bids",
  //   visibleFor: "all",
  //   sx: { textTransform: "none" },
  // },
  {
    label: filterLabels[SwapFilter.MY_SWAPS],
    value: SwapFilter.MY_SWAPS,
    dataTestId: "filter-my-swaps",
    visibleFor: "all",
    sx: { textTransform: "none" },
  },
  {
    label: filterLabels[SwapFilter.PENDING_APPROVAL],
    value: SwapFilter.PENDING_APPROVAL,
    dataTestId: "filter-pending-approval",
    visibleFor: "leader",
    sx: { textTransform: "none" },
  },
  {
    label: filterLabels[SwapFilter.COMPLETED],
    value: SwapFilter.COMPLETED,
    dataTestId: "filter-completed",
    visibleFor: "leader",
    sx: { textTransform: "none" },
  },
];

interface SwapTabProps {
  teamWithMembership: TeamWithMembership;
  currentUserId: string;
  lng: string;
}

export default function SwapTab({
  teamWithMembership,
  currentUserId,
  lng,
}: SwapTabProps) {
  const teamId = teamWithMembership.team.id;
  const isMobile = useIsMobile();

  // Hooks
  const getSwaps = useGetSwaps();
  const getSwapById = useGetSwapById();
  const createSwap = useCreateSwap();
  const addBid = useAddBid();
  const acceptBid = useAcceptBid();
  const acceptDirectSwap = useAcceptDirectSwap();
  const approveSwap = useApproveSwap();
  const deleteSwap = useDeleteSwap();
  const denySwap = useDenySwap();
  const revertSwap = useRevertSwap();
  const getWorkers = useGetWorkers();
  const getShifts = useGetShifts();
  const getLinkShifts = useGetLinkShifts();
  const getAssignments = useGetAssignments();

  const [currentFilter, setCurrentFilter] = useState<SwapFilter>(
    SwapFilter.ALL_ACTIVE_OPEN,
  );
  const [swaps, setSwaps] = useState<SwapRequestT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [linkShifts, setLinkShifts] = useState<LinkShiftT[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDataDictT[]>([]);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<SwapRequestT | null>(null);

  // Check if user is a leader
  const isLeader = teamWithMembership.membership.role === "owner";

  // Helper function to process assignments with worker and shift data
  const buildAssignmentDataDict = useCallback(
    (
      assignmentsRead: any[],
      workersData: WorkerT[],
      shiftsData: ShiftT[],
    ): AssignmentDataDictT[] => {
      const shiftMap = new Map(shiftsData.map((shift) => [shift.id, shift]));
      const workerMap = new Map(
        workersData.map((worker) => [worker.id, worker]),
      );

      return assignmentsRead.map((assignment) => ({
        assignment,
        worker: workerMap.get(assignment.workerId) || ({} as WorkerT),
        shift: shiftMap.get(assignment.shiftId) || ({} as ShiftT),
        recurrence: null,
        breaches: [],
        requests: [],
      }));
    },
    [],
  );

  const loadInitialData = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      // Load workers, shifts, link shifts, and assignments in parallel
      const [workersData, shiftsData, linkShiftsData, assignmentsResult] =
        await Promise.all([
          getWorkers(teamId),
          getShifts(teamId),
          getLinkShifts(teamId),
          getAssignments(
            teamId,
            false,
            dayjs.utc().add(1, "day").startOf("day"),
            undefined,
          ),
        ]);

      setWorkers(workersData);
      setShifts(shiftsData);
      setLinkShifts(linkShiftsData);

      const assignmentsData = buildAssignmentDataDict(
        assignmentsResult.assignmentsRead,
        workersData,
        shiftsData,
      );

      setAssignments(assignmentsData);
    } catch (err: any) {
      console.error("Failed to load initial data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [
    teamId,
    getWorkers,
    getShifts,
    getLinkShifts,
    getAssignments,
    buildAssignmentDataDict,
  ]);

  const loadSwaps = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);
      // Fetch all swaps, filtering will be done client-side
      const data = await getSwaps(teamId);
      setSwaps(data);
    } catch (err: any) {
      setError(err.message || "Failed to load swaps");
    } finally {
      setLoading(false);
    }
  }, [teamId, getSwaps]);

  const loadAssignments = useCallback(async () => {
    if (!teamId) return;

    try {
      const assignmentsResult = await getAssignments(
        teamId,
        false,
        dayjs.utc().add(1, "day").startOf("day"),
        undefined,
      );

      const assignmentsData = buildAssignmentDataDict(
        assignmentsResult.assignmentsRead,
        workers,
        shifts,
      );

      setAssignments(assignmentsData);
    } catch (err: any) {
      console.error("Failed to load assignments:", err);
    }
  }, [teamId, getAssignments, workers, shifts, buildAssignmentDataDict]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load swaps when tab changes
  useEffect(() => {
    loadSwaps();
  }, [loadSwaps]);

  const handleFilterChange = (
    _event: React.SyntheticEvent,
    newFilter: SwapFilter,
  ) => {
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
            swap.createdByUserId !== currentUserId
          );

        case SwapFilter.DIRECT_PROPOSALS:
          // Direct swaps where I am the target worker
          return (
            swap.swapType === SwapType.DIRECT &&
            swap.targetWorkerId === currentUserId &&
            swap.status === SwapStatus.ACTIVE
          );

        case SwapFilter.MY_BIDS:
          // Open swaps where I have placed a bid
          return (
            swap.swapType === SwapType.OPEN &&
            swap.bids.some((bid) => bid.workerId === currentUserId)
          );

        case SwapFilter.MY_SWAPS:
          // Swaps I created
          return swap.createdByUserId === currentUserId;

        case SwapFilter.PENDING_APPROVAL:
          // Swaps pending approval (leader only)
          return swap.status === SwapStatus.PENDING_APPROVAL;

        case SwapFilter.COMPLETED:
          // Completed swaps (leader only)
          return swap.status === SwapStatus.COMPLETED;

        default:
          return true;
      }
    });
  }, [swaps, currentFilter, currentUserId]);

  // Pre-compute enriched swap data with assignments and creator info
  const enrichedSwaps = useMemo(() => {
    return filteredSwaps.map((swap) => {
      const offeredAssignments = assignments.filter((a) =>
        swap.offeredAssignmentIds.includes(a.assignment.id),
      );

      const requestedAssignments = swap.requestedAssignmentIds
        ? assignments.filter((a) =>
            swap.requestedAssignmentIds!.includes(a.assignment.id),
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

  const handleAcceptDirectSwap = async (swapId: string) => {
    await acceptDirectSwap(swapId);
    loadSwaps();
    const updatedSwap = await getSwapById(swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleApproveSwap = async (swapId: string) => {
    await approveSwap(swapId);
    await Promise.all([loadSwaps(), loadAssignments()]);
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

  const handleDeleteSwap = async (swapId: string) => {
    await deleteSwap(swapId);
    loadSwaps();
  };

  const openDetailDialog = (swap: SwapRequestT) => {
    setSelectedSwap(swap);
    setDetailDialogOpen(true);
  };

  const visibleTabs = useMemo(
    () =>
      SWAP_TABS.filter(
        (tab) =>
          tab.visibleFor === "all" ||
          (tab.visibleFor === "leader" && isLeader) ||
          (tab.visibleFor === "member" && !isLeader),
      ),
    [isLeader],
  );

  return (
    <Box sx={{ backgroundColor: "white", minHeight: "100vh" }}>
      {isMobile && <MobileNavAppBar lng={lng} />}
      <Container
        maxWidth="lg"
        sx={{ py: isMobile ? 0 : 3, pt: isMobile ? 1 : undefined }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {!isMobile && (
            <Typography
              component="span"
              className="title"
              role="heading"
              aria-level={1}
              sx={{ fontSize: "1.25rem", fontWeight: 600, color: "#1976d2" }}
            >
              Swaps
            </Typography>
          )}
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              data-testid="create-swap-button"
            >
              Create Swap
            </Button>
          )}
        </Box>

        <Tabs
          value={currentFilter}
          onChange={handleFilterChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          sx={{ marginBottom: "2px" }}
        >
          {visibleTabs.map((tab) => (
            <Tab
              key={tab.value}
              label={tab.label}
              value={tab.value}
              data-testid={tab.dataTestId}
              sx={tab.sx}
            />
          ))}
        </Tabs>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ py: 2 }}>
            {error}
          </Typography>
        )}

        {!loading && !error && filteredSwaps.length === 0 && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ py: 4, textAlign: "center" }}
          >
            {currentFilter === SwapFilter.MY_SWAPS &&
              "You haven't created any swaps yet"}
            {currentFilter === SwapFilter.DIRECT_PROPOSALS &&
              "No direct swap proposals for you"}
            {currentFilter === SwapFilter.MY_BIDS &&
              "You haven't placed any bids yet"}
            {currentFilter === SwapFilter.ALL_ACTIVE_OPEN &&
              "No active open swaps available"}
            {currentFilter === SwapFilter.PENDING_APPROVAL &&
              "No swaps pending approval"}
            {currentFilter === SwapFilter.COMPLETED && "No completed swaps"}
          </Typography>
        )}

        <Box
          sx={{
            height: isMobile
              ? "calc(100vh - 123px)" // 65px - 8px - 48px - 2px
              : "calc(100vh - 200px)", // 65px - 24px-36.5px-48px-2px
            overflowY: "auto",
          }}
        >
          {!loading &&
            !error &&
            enrichedSwaps.map(
              ({
                swap,
                offeredAssignments,
                requestedAssignments,
                creatorWorker,
              }) => (
                <SwapCard
                  key={swap.id}
                  swap={swap}
                  offeredAssignments={offeredAssignments}
                  requestedAssignments={requestedAssignments}
                  creatorWorker={creatorWorker}
                  onClick={openDetailDialog}
                />
              ),
            )}
        </Box>

        {/* Create Swap Dialog */}
        <CreateSwapDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateSwap}
          teamId={teamId}
          currentUserId={currentUserId}
          role={teamWithMembership.membership.role}
          workers={workers}
          assignments={assignments}
          linkShifts={linkShifts}
        />

        {/* Swap Detail Dialog */}
        <SwapDetailDialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          swap={selectedSwap}
          teamId={teamId}
          currentUserId={currentUserId}
          isLeader={isLeader}
          workers={workers}
          assignments={assignments}
          linkShifts={linkShifts}
          onAddBid={
            selectedSwap
              ? (workerId, bidIds) =>
                  handleAddBid(selectedSwap.id, workerId, bidIds)
              : undefined
          }
          onAcceptBid={
            selectedSwap
              ? (bidId) => handleAcceptBid(selectedSwap.id, bidId)
              : undefined
          }
          onAcceptDirectSwap={
            selectedSwap
              ? () => handleAcceptDirectSwap(selectedSwap.id)
              : undefined
          }
          onApprove={
            selectedSwap ? () => handleApproveSwap(selectedSwap.id) : undefined
          }
          onDeny={
            selectedSwap ? () => handleDenySwap(selectedSwap.id) : undefined
          }
          onRevert={
            selectedSwap ? () => handleRevertSwap(selectedSwap.id) : undefined
          }
          onDelete={
            selectedSwap ? () => handleDeleteSwap(selectedSwap.id) : undefined
          }
        />

        {/* FAB for mobile */}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="create swap"
            onClick={() => setCreateDialogOpen(true)}
            data-testid="create-swap-fab"
            sx={{
              position: "fixed",
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
