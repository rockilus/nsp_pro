"use client";

import React, { useState, useEffect } from "react";
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
import AssignmentSelector from "./AssignmentSelector";
import { AssignmentApi } from "../../app/lib/api/assignmentApi";
import { WorkerApi } from "../../app/lib/api/workerApi";
import { useApiClient } from "../../app/lib/api-client";

interface SwapDetailDialogProps {
  open: boolean;
  onClose: () => void;
  swap: SwapRequestT | null;
  teamId: string;
  currentUserId: string;
  isLeader: boolean;
  onAddBid?: (workerId: string, bidAssignmentIds: string[]) => Promise<void>;
  onAcceptBid?: (bidId: string) => Promise<void>;
  onAcceptDirectSwap?: () => Promise<void>;
  onApprove?: () => Promise<void>;
  onCancel?: () => Promise<void>;
}

export default function SwapDetailDialog({
  open,
  onClose,
  swap,
  teamId,
  currentUserId,
  isLeader,
  onAddBid,
  onAcceptBid,
  onAcceptDirectSwap,
  onApprove,
  onCancel,
}: SwapDetailDialogProps) {
  const apiClient = useApiClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // State for add bid
  const [showAddBid, setShowAddBid] = useState(false);
  const [bidAssignmentIds, setBidAssignmentIds] = useState<string[]>([]);

  // Assignment and worker data
  const [offeredAssignments, setOfferedAssignments] = useState<
    AssignmentDataDictT[]
  >([]);
  const [requestedAssignments, setRequestedAssignments] = useState<
    AssignmentDataDictT[]
  >([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);

  // Load assignment and worker details
  useEffect(() => {
    if (open && swap) {
      const loadDetails = async () => {
        try {
          setLoading(true);
          setError(null);

          // Load workers and assignments in parallel
          const [workerList, assignmentResult] = await Promise.all([
            WorkerApi.getWorkers(apiClient, teamId, undefined, false),
            AssignmentApi.getAssignments(
              apiClient,
              teamId,
              false,
              dayjs().subtract(60, "day"),
              dayjs().add(60, "day"),
            ),
          ]);

          setWorkers(workerList);

          // Extract assignments from result
          const allAssignments: AssignmentDataDictT[] =
            assignmentResult.assignmentsRead.map((assignment) => {
              return {
                assignment,
                worker:
                  workerList.find((w) => w.id === assignment.workerId) ||
                  ({} as WorkerT),
                shift: {} as any,
                recurrence: null,
                breaches: [],
                requests: [],
              } as AssignmentDataDictT;
            });

          // Filter offered assignments
          const offered = allAssignments.filter((a) =>
            swap.offeredAssignmentIds.includes(a.assignment.id),
          );
          setOfferedAssignments(offered);

          // Filter requested assignments (if direct swap)
          if (
            swap.swapType === SwapType.DIRECT &&
            swap.requestedAssignmentIds &&
            swap.requestedAssignmentIds.length > 0
          ) {
            const requested = allAssignments.filter((a) =>
              swap.requestedAssignmentIds!.includes(a.assignment.id),
            );
            setRequestedAssignments(requested);
          }
        } catch (err) {
          console.error("Failed to load swap details:", err);
          setError("Failed to load swap details");
        } finally {
          setLoading(false);
        }
      };

      loadDetails();
    }
  }, [open, swap, teamId, apiClient]);

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

  const handleCancel = async () => {
    if (!onCancel) return;

    try {
      setLoading(true);
      setError(null);
      await onCancel();
      onClose();
    } catch (err) {
      console.error("Failed to cancel swap:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel swap");
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
  ): "default" | "info" | "warning" | "success" => {
    switch (status) {
      case SwapStatus.ACTIVE:
        return "info";
      case SwapStatus.PENDING_APPROVAL:
        return "warning";
      case SwapStatus.COMPLETED:
        return "success";
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

  const canCancel =
    (swap.status === SwapStatus.ACTIVE ||
      swap.status === SwapStatus.PENDING_APPROVAL) &&
    (isLeader || swap.offeredAssignmentIds.length > 0); // Simplification - check if user owns offered assignments

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Swap Request Details</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading && !swap ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
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
                />
                <Chip label={swap.status} color={getStatusColor(swap.status)} />
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
              <Tab label="Details" />
              {swap.swapType === SwapType.OPEN && (
                <Tab label={`Bids (${swap.bids.length})`} />
              )}
              {swap.status === SwapStatus.COMPLETED &&
                swap.auditData.length > 0 && <Tab label="Audit Trail" />}
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
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Offered Assignments ({offeredAssignments.length})
                  </Typography>
                  {offeredAssignments.map((data) => (
                    <Paper key={data.assignment.id} sx={{ p: 1, mb: 1 }}>
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
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Requested Assignments ({requestedAssignments.length})
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        From: {getWorkerName(swap.targetWorkerId)}
                      </Typography>
                      {requestedAssignments.map((data) => (
                        <Paper key={data.assignment.id} sx={{ p: 1, mb: 1 }}>
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
                      teamId={teamId}
                      selectedAssignmentIds={bidAssignmentIds}
                      onSelectionChange={setBidAssignmentIds}
                      workerId={currentUserId}
                      excludeAssignmentIds={swap.offeredAssignmentIds}
                      minDate={dayjs()}
                      allowMultiple={true}
                    />
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                      <Button
                        onClick={handleAddBid}
                        variant="contained"
                        disabled={bidAssignmentIds.length === 0 || loading}
                      >
                        Submit Bid
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddBid(false);
                          setBidAssignmentIds([]);
                        }}
                        disabled={loading}
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
          <Box>
            {canCancel && (
              <Button onClick={handleCancel} color="error" disabled={loading}>
                Cancel Swap
              </Button>
            )}
          </Box>
          <Box display="flex" gap={1}>
            <Button onClick={onClose} disabled={loading}>
              Close
            </Button>
            {canAcceptDirectSwap && (
              <Button
                onClick={handleAcceptDirectSwap}
                variant="contained"
                color="primary"
                disabled={loading}
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
