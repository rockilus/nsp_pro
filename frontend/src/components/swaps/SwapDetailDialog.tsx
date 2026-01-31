"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Paper,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { SwapRequestT, SwapBidT, SwapType, SwapStatus } from "../../types/swap";
import { AssignmentDataDictT } from "../../types/assignment";
import { WorkerT } from "../../types/worker";
import { LinkShiftT } from "../../types/shift";
import AssignmentSelector from "./AssignmentSelector";

interface SwapDetailDialogProps {
  open: boolean;
  onClose: () => void;
  swap: SwapRequestT | null;
  teamId: string;
  currentUserId: string;
  isLeader: boolean;
  workers: WorkerT[];
  assignments: AssignmentDataDictT[];
  linkShifts: LinkShiftT[];
  onAddBid?: (workerId: string, bidAssignmentIds: string[]) => Promise<void>;
  onAcceptBid?: (bidId: string) => Promise<void>;
  onAcceptDirectSwap?: () => Promise<void>;
  onApprove?: () => Promise<void>;
  onDeny?: () => Promise<void>;
  onRevert?: () => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function SwapDetailDialog({
  open,
  onClose,
  swap,
  teamId,
  currentUserId,
  isLeader,
  workers,
  assignments,
  linkShifts,
  onAddBid,
  onAcceptBid,
  onAcceptDirectSwap,
  onApprove,
  onDeny,
  onRevert,
  onDelete,
}: SwapDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // State for add bid
  const [showAddBid, setShowAddBid] = useState(false);
  const [bidAssignmentIds, setBidAssignmentIds] = useState<string[]>([]);

  // Filter assignments for current swap
  const offeredAssignments = useMemo(() => {
    if (!swap) return [];
    return assignments.filter((a) =>
      swap.offeredAssignmentIds.includes(a.assignment.id),
    );
  }, [swap, assignments]);

  const requestedAssignments = useMemo(() => {
    if (
      !swap ||
      swap.swapType !== SwapType.DIRECT ||
      !swap.requestedAssignmentIds
    )
      return [];
    return assignments.filter((a) =>
      swap.requestedAssignmentIds!.includes(a.assignment.id),
    );
  }, [swap, assignments]);

  const handleAddBid = async () => {
    if (!onAddBid || bidAssignmentIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      await onAddBid(currentUserId, bidAssignmentIds);
      setShowAddBid(false);
      setBidAssignmentIds([]);
    } catch (err) {
      console.error("Failed to add bid:", err);
      setError(err instanceof Error ? err.message : "Failed to add bid");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    if (!onAcceptBid) return;

    try {
      setLoading(true);
      setError(null);
      await onAcceptBid(bidId);
    } catch (err) {
      console.error("Failed to accept bid:", err);
      setError(err instanceof Error ? err.message : "Failed to accept bid");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDirectSwap = async () => {
    if (!onAcceptDirectSwap) return;

    try {
      setLoading(true);
      setError(null);
      await onAcceptDirectSwap();
    } catch (err) {
      console.error("Failed to accept swap:", err);
      setError(err instanceof Error ? err.message : "Failed to accept swap");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;

    try {
      setLoading(true);
      setError(null);
      await onApprove();
    } catch (err) {
      console.error("Failed to approve swap:", err);
      setError(err instanceof Error ? err.message : "Failed to approve swap");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!onDeny) return;

    try {
      setLoading(true);
      setError(null);
      await onDeny();
    } catch (err) {
      console.error("Failed to deny swap:", err);
      setError(err instanceof Error ? err.message : "Failed to deny swap");
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async () => {
    if (!onRevert) return;

    try {
      setLoading(true);
      setError(null);
      await onRevert();
    } catch (err) {
      console.error("Failed to revert swap:", err);
      setError(err instanceof Error ? err.message : "Failed to revert swap");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setLoading(true);
      setError(null);
      await onDelete();
      onClose();
    } catch (err) {
      console.error("Failed to delete swap:", err);
      setError(err instanceof Error ? err.message : "Failed to delete swap");
    } finally {
      setLoading(false);
    }
  };

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    return worker ? worker.name : "Unknown Worker";
  };

  const getStatusColor = (
    status: SwapStatus,
  ): "default" | "info" | "warning" | "success" | "error" => {
    switch (status) {
      case SwapStatus.ACTIVE:
        return "info";
      case SwapStatus.PENDING_APPROVAL:
        return "warning";
      case SwapStatus.COMPLETED:
        return "success";
      case SwapStatus.DENIED:
        return "error";
      case SwapStatus.REVERTED:
        return "warning";
      default:
        return "default";
    }
  };

  if (!swap) {
    return null;
  }

  // Determine available actions based on role and swap state
  const canAddBid =
    swap.swapType === SwapType.OPEN &&
    swap.status === SwapStatus.ACTIVE &&
    !isLeader;

  const canAcceptBid =
    swap.swapType === SwapType.OPEN &&
    swap.status === SwapStatus.ACTIVE &&
    swap.bids.length > 0;

  const canAcceptDirectSwap =
    swap.swapType === SwapType.DIRECT &&
    swap.status === SwapStatus.ACTIVE &&
    swap.targetWorkerId === currentUserId;

  const canApprove = swap.status === SwapStatus.PENDING_APPROVAL && isLeader;

  const canDeny = swap.status === SwapStatus.PENDING_APPROVAL && isLeader;

  const canRevert = swap.status === SwapStatus.COMPLETED && isLeader;

  const canDelete =
    (swap.status === SwapStatus.ACTIVE ||
      swap.status === SwapStatus.PENDING_APPROVAL) &&
    (isLeader || swap.offeredAssignmentIds.length > 0); // Simplification - check if user owns offered assignments

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      data-testid="swap-detail-dialog"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Swap Request Details</Typography>
          <IconButton
            onClick={onClose}
            size="small"
            data-testid="close-dialog-button"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading && !swap ? (
          <Box
            display="flex"
            justifyContent="center"
            p={3}
            data-testid="loading-indicator"
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} data-testid="error-alert">
                {error}
              </Alert>
            )}

            {/* Swap Info Header */}
            <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Chip
                  label={
                    swap.swapType === SwapType.DIRECT
                      ? "Direct Swap"
                      : "Open Swap"
                  }
                  color="primary"
                  data-testid="swap-type-chip"
                />
                <Chip
                  label={swap.status}
                  color={getStatusColor(swap.status)}
                  data-testid="swap-status-chip"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Created: {swap.createdAt.format("MMM D, YYYY HH:mm")}
              </Typography>
              {swap.completedAt && (
                <Typography variant="body2" color="text.secondary">
                  Completed: {swap.completedAt.format("MMM D, YYYY HH:mm")}
                </Typography>
              )}
            </Paper>

            {/* Tabs for different views */}
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="Details" data-testid="details-tab" />
              {swap.swapType === SwapType.OPEN && (
                <Tab
                  label={`Bids (${swap.bids.length})`}
                  data-testid="bids-tab"
                />
              )}
              {swap.status === SwapStatus.COMPLETED &&
                swap.auditData.length > 0 && (
                  <Tab label="Audit Trail" data-testid="audit-trail-tab" />
                )}
            </Tabs>

            {/* Tab Content */}
            {tabValue === 0 && (
              <Box>
                {/* Worker */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Worker
                  </Typography>
                  <Typography variant="body1">
                    {getWorkerName(swap.offeredAssignmentIds[0] || "")}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Offered Assignments */}
                <Box sx={{ mb: 2 }} data-testid="offered-assignments-section">
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Offered Assignments ({offeredAssignments.length})
                  </Typography>
                  {offeredAssignments.map((data) => (
                    <Paper
                      key={data.assignment.id}
                      sx={{ p: 1, mb: 1 }}
                      data-testid={`offered-assignment-${data.assignment.id}`}
                    >
                      <Typography variant="body2">
                        {data.assignment.date.format("MMM D, YYYY")} -{" "}
                        {data.shift.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.shift.startTime.format("HH:mm")} -{" "}
                        {data.shift.endTime.format("HH:mm")}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                {/* Requested Assignments (Direct Swap) */}
                {swap.swapType === SwapType.DIRECT && swap.targetWorkerId && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box
                      sx={{ mb: 2 }}
                      data-testid="requested-assignments-section"
                    >
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Requested Assignments ({requestedAssignments.length})
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1 }}
                        data-testid="target-worker-name"
                      >
                        From: {getWorkerName(swap.targetWorkerId)}
                      </Typography>
                      {requestedAssignments.map((data) => (
                        <Paper
                          key={data.assignment.id}
                          sx={{ p: 1, mb: 1 }}
                          data-testid={`requested-assignment-${data.assignment.id}`}
                        >
                          <Typography variant="body2">
                            {data.assignment.date.format("MMM D, YYYY")} -{" "}
                            {data.shift.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {data.shift.startTime.format("HH:mm")} -{" "}
                            {data.shift.endTime.format("HH:mm")}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </>
                )}

                {/* Comment */}
                {swap.comment && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Comment
                      </Typography>
                      <Typography variant="body2">{swap.comment}</Typography>
                    </Box>
                  </>
                )}
              </Box>
            )}

            {/* Bids Tab */}
            {tabValue === 1 && swap.swapType === SwapType.OPEN && (
              <Box>
                {showAddBid ? (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      Select Your Assignments to Bid
                    </Typography>
                    <AssignmentSelector
                      selectedAssignmentIds={bidAssignmentIds}
                      onSelectionChange={setBidAssignmentIds}
                      assignments={assignments.filter(
                        (a) =>
                          a.assignment.workerId === currentUserId &&
                          !swap.offeredAssignmentIds.includes(
                            a.assignment.id,
                          ) &&
                          a.assignment.date.isAfter(dayjs(), "day"),
                      )}
                      linkShifts={linkShifts}
                      allowMultiple={true}
                    />
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                      <Button
                        onClick={handleAddBid}
                        variant="contained"
                        disabled={bidAssignmentIds.length === 0 || loading}
                        data-testid="submit-bid-button"
                      >
                        Submit Bid
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddBid(false);
                          setBidAssignmentIds([]);
                        }}
                        disabled={loading}
                        data-testid="cancel-bid-button"
                      >
                        Cancel
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    {canAddBid && (
                      <Button
                        onClick={() => setShowAddBid(true)}
                        variant="contained"
                        sx={{ mb: 2 }}
                        data-testid="add-bid-button"
                      >
                        Add Your Bid
                      </Button>
                    )}

                    {swap.bids.length === 0 ? (
                      <Alert severity="info">No bids yet</Alert>
                    ) : (
                      <List>
                        {swap.bids.map((bid) => (
                          <Paper key={bid.id} sx={{ mb: 1 }}>
                            <ListItem
                              secondaryAction={
                                canAcceptBid &&
                                !bid.accepted && (
                                  <IconButton
                                    edge="end"
                                    onClick={() => handleAcceptBid(bid.id)}
                                    disabled={loading}
                                    color="primary"
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                )
                              }
                            >
                              <ListItemText
                                primary={
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={1}
                                  >
                                    <Typography variant="body1">
                                      {getWorkerName(bid.workerId)}
                                    </Typography>
                                    {bid.accepted && (
                                      <Chip
                                        label="Accepted"
                                        size="small"
                                        color="success"
                                      />
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {bid.offeredAssignmentIds.length}{" "}
                                      assignment(s)
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {bid.createdAt.format(
                                        "MMM D, YYYY HH:mm",
                                      )}
                                    </Typography>
                                  </>
                                }
                              />
                            </ListItem>
                          </Paper>
                        ))}
                      </List>
                    )}
                  </>
                )}
              </Box>
            )}

            {/* Audit Trail Tab */}
            {tabValue === 2 && swap.status === SwapStatus.COMPLETED && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Original Assignment Data
                </Typography>
                {swap.auditData.map((audit, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 1 }}>
                    <Typography variant="body2">
                      Assignment ID: {audit.assignmentId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Worker: {getWorkerName(audit.workerId)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date: {audit.dateIso}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shift ID: {audit.shiftId}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Box display="flex" justifyContent="space-between" width="100%" px={1}>
          <Box display="flex" gap={1}>
            {canDelete && (
              <Button
                onClick={handleDelete}
                color="error"
                disabled={loading}
                data-testid="delete-swap-button"
              >
                Delete Swap
              </Button>
            )}
            {canDeny && (
              <Button
                onClick={handleDeny}
                color="error"
                disabled={loading}
                data-testid="deny-swap-button"
              >
                Deny Swap
              </Button>
            )}
            {canRevert && (
              <Button
                onClick={handleRevert}
                color="warning"
                disabled={loading}
                data-testid="revert-swap-button"
              >
                Revert Swap
              </Button>
            )}
          </Box>
          <Box display="flex" gap={1}>
            <Button
              onClick={onClose}
              disabled={loading}
              data-testid="close-button"
            >
              Close
            </Button>
            {canAcceptDirectSwap && (
              <Button
                onClick={handleAcceptDirectSwap}
                variant="contained"
                color="primary"
                disabled={loading}
                data-testid="accept-direct-swap-button"
              >
                Accept Swap
              </Button>
            )}
            {canApprove && (
              <Button
                onClick={handleApprove}
                variant="contained"
                color="success"
                disabled={loading}
                data-testid="approve-swap-button"
              >
                Approve Swap
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
