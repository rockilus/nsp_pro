"use client";

import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Container,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
} from "@mui/material";
import { SwapHoriz as SwapIcon, Add as AddIcon } from "@mui/icons-material";
import { SwapRequestT, SwapStatus, SwapType } from "../../types/swap";
import { WorkerT } from "../../types/worker";
import { ShiftT } from "../../types/shift";
import { LinkShiftT } from "../../types/shift";
import { AssignmentDataDictT } from "../../types/assignment";
import CreateSwapDialog from "./CreateSwapDialog";
import SwapDetailDialog from "./SwapDetailDialog";
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

const statusColors: Record<
  SwapStatus,
  "default" | "warning" | "success" | "error"
> = {
  [SwapStatus.ACTIVE]: "warning",
  [SwapStatus.PENDING_APPROVAL]: "default",
  [SwapStatus.COMPLETED]: "success",
  [SwapStatus.DENIED]: "error",
  [SwapStatus.REVERTED]: "warning",
};

const statusLabels: Record<SwapStatus, string> = {
  [SwapStatus.ACTIVE]: "Active",
  [SwapStatus.PENDING_APPROVAL]: "Pending Approval",
  [SwapStatus.COMPLETED]: "Completed",
  [SwapStatus.DENIED]: "Denied",
  [SwapStatus.REVERTED]: "Reverted",
};

interface SwapTabProps {
  teamWithMembership: TeamWithMembership;
  currentUserId: string;
}

export default function SwapTab({
  teamWithMembership,
  currentUserId,
}: SwapTabProps) {
  const teamId = teamWithMembership.team.id;

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

  const [currentTab, setCurrentTab] = useState<SwapStatus | "all">("all");
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

      // Build assignment data dict
      const shiftMap = new Map(shiftsData.map((shift) => [shift.id, shift]));
      const workerMap = new Map(
        workersData.map((worker) => [worker.id, worker]),
      );

      const assignmentsData: AssignmentDataDictT[] =
        assignmentsResult.assignmentsRead.map((assignment) => ({
          assignment,
          worker: workerMap.get(assignment.workerId) || ({} as WorkerT),
          shift: shiftMap.get(assignment.shiftId) || ({} as ShiftT),
          recurrence: null,
          breaches: [],
          requests: [],
        }));

      setAssignments(assignmentsData);
    } catch (err: any) {
      console.error("Failed to load initial data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [teamId, getWorkers, getShifts, getLinkShifts, getAssignments]);

  const loadSwaps = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);
      const status = currentTab === "all" ? undefined : currentTab;
      const data = await getSwaps(teamId, status);
      setSwaps(data);
    } catch (err: any) {
      setError(err.message || "Failed to load swaps");
    } finally {
      setLoading(false);
    }
  }, [teamId, currentTab, getSwaps]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load swaps when tab changes
  useEffect(() => {
    loadSwaps();
  }, [loadSwaps]);

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: SwapStatus | "all",
  ) => {
    setCurrentTab(newValue);
  };

  const getFilteredSwaps = () => {
    if (currentTab === "all") {
      return swaps;
    }
    return swaps.filter((swap) => swap.status === currentTab);
  };

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
    loadSwaps();
    const updatedSwap = await getSwapById(swapId);
    setSelectedSwap(updatedSwap);
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          <SwapIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Assignment Swaps
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          data-testid="create-swap-button"
        >
          Create Swap
        </Button>
      </Box>

      <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="All" value="all" />
        <Tab label="Active" value={SwapStatus.ACTIVE} />
        <Tab label="Pending Approval" value={SwapStatus.PENDING_APPROVAL} />
        <Tab label="Completed" value={SwapStatus.COMPLETED} />
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

      {!loading && !error && getFilteredSwaps().length === 0 && (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ py: 4, textAlign: "center" }}
        >
          No swaps found
        </Typography>
      )}

      {!loading &&
        !error &&
        getFilteredSwaps().map((swap) => (
          <Card key={swap.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" component="div">
                    {swap.swapType === SwapType.DIRECT ? "Direct" : "Open"} Swap
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created {swap.createdAt.format("MMM D, YYYY")}
                  </Typography>
                </Box>
                <Chip
                  label={statusLabels[swap.status]}
                  color={statusColors[swap.status]}
                  size="small"
                />
              </Box>

              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Offering:</strong> {swap.offeredAssignmentIds.length}{" "}
                assignment(s)
              </Typography>

              {swap.requestedAssignmentIds && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Requesting:</strong>{" "}
                  {swap.requestedAssignmentIds.length} assignment(s)
                </Typography>
              )}

              {swap.swapType === SwapType.OPEN && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Bids:</strong> {swap.bids.length}
                </Typography>
              )}

              {swap.comment && (
                <Typography variant="body2" sx={{ mt: 2, fontStyle: "italic" }}>
                  {swap.comment}
                </Typography>
              )}
            </CardContent>

            <CardActions>
              <Button
                size="small"
                onClick={() => openDetailDialog(swap)}
                data-testid="view-details-button"
              >
                View Details
              </Button>

              {swap.status === SwapStatus.ACTIVE &&
                swap.swapType === SwapType.OPEN && (
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => openDetailDialog(swap)}
                  >
                    Add Bid
                  </Button>
                )}

              {swap.status === SwapStatus.PENDING_APPROVAL && isLeader && (
                <Button
                  size="small"
                  color="success"
                  onClick={async () => {
                    try {
                      await handleApproveSwap(swap.id);
                    } catch (err: any) {
                      setError(err.message || "Failed to approve swap");
                    }
                  }}
                >
                  Approve
                </Button>
              )}
            </CardActions>
          </Card>
        ))}

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
    </Container>
  );
}
