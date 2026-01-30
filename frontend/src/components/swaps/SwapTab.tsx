"use client";

import { useState, useEffect } from "react";
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
import { SwapApi } from "../../app/lib/api/swapApi";
import { useApiClient } from "../../app/lib/api-client";
import CreateSwapDialog from "./CreateSwapDialog";
import SwapDetailDialog from "./SwapDetailDialog";
import { TeamWithMembership } from "../../types/team";

const statusColors: Record<
  SwapStatus,
  "default" | "warning" | "success" | "error"
> = {
  [SwapStatus.ACTIVE]: "warning",
  [SwapStatus.PENDING_APPROVAL]: "default",
  [SwapStatus.COMPLETED]: "success",
  [SwapStatus.CANCELLED]: "error",
};

const statusLabels: Record<SwapStatus, string> = {
  [SwapStatus.ACTIVE]: "Active",
  [SwapStatus.PENDING_APPROVAL]: "Pending Approval",
  [SwapStatus.COMPLETED]: "Completed",
  [SwapStatus.CANCELLED]: "Cancelled",
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
  const apiClient = useApiClient();

  const [currentTab, setCurrentTab] = useState<SwapStatus | "all">("all");
  const [swaps, setSwaps] = useState<SwapRequestT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<SwapRequestT | null>(null);

  // Check if user is a leader
  const isLeader = teamWithMembership.membership.role === "owner";

  useEffect(() => {
    loadSwaps();
  }, [teamId, currentTab]);

  const loadSwaps = async () => {
    if (!apiClient || !teamId) return;

    try {
      setLoading(true);
      setError(null);
      const status = currentTab === "all" ? undefined : currentTab;
      const data = await SwapApi.getSwapsForTeam(apiClient, teamId, status);
      setSwaps(data);
    } catch (err: any) {
      setError(err.message || "Failed to load swaps");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: SwapStatus | "all",
  ) => {
    setCurrentTab(newValue);
  };

  const getFilteredSwaps = () => {
    if (currentTab === "all") return swaps;
    return swaps.filter((swap) => swap.status === currentTab);
  };

  const handleCreateSwap = async (swapData: {
    offeredAssignmentIds: string[];
    requestedAssignmentIds: string[];
    swapType: SwapType;
    targetWorkerId: string | null;
    comment: string;
  }) => {
    if (!apiClient || !teamId) return;

    await SwapApi.createSwap(apiClient, teamId, swapData);
    loadSwaps();
  };

  const handleAddBid = async (
    swapId: string,
    bidderWorkerId: string,
    bidAssignmentIds: string[],
  ) => {
    if (!apiClient) return;
    await SwapApi.addBid(apiClient, swapId, bidderWorkerId, bidAssignmentIds);
    loadSwaps();
    // Refresh selected swap
    const updatedSwap = await SwapApi.getSwapById(apiClient, swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleAcceptBid = async (swapId: string, bidId: string) => {
    if (!apiClient) return;
    await SwapApi.acceptBid(apiClient, swapId, bidId);
    loadSwaps();
    const updatedSwap = await SwapApi.getSwapById(apiClient, swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleAcceptDirectSwap = async (swapId: string) => {
    if (!apiClient) return;
    await SwapApi.acceptDirectSwap(apiClient, swapId);
    loadSwaps();
    const updatedSwap = await SwapApi.getSwapById(apiClient, swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleApproveSwap = async (swapId: string) => {
    if (!apiClient) return;
    await SwapApi.approveSwap(apiClient, swapId);
    loadSwaps();
    const updatedSwap = await SwapApi.getSwapById(apiClient, swapId);
    setSelectedSwap(updatedSwap);
  };

  const handleCancelSwap = async (swapId: string) => {
    if (!apiClient) return;
    await SwapApi.cancelSwap(apiClient, swapId);
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
              <Button size="small" onClick={() => openDetailDialog(swap)}>
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
        isLeader={isLeader}
      />

      {/* Swap Detail Dialog */}
      <SwapDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        swap={selectedSwap}
        teamId={teamId}
        currentUserId={currentUserId}
        isLeader={isLeader}
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
        onCancel={
          selectedSwap ? () => handleCancelSwap(selectedSwap.id) : undefined
        }
      />
    </Container>
  );
}
