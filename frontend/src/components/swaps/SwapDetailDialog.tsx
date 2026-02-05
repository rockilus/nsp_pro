"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { SwapRequestT, SwapType, SwapStatus } from "../../types/swap";
import { SwapValidationResultT } from "../../types/swapValidation";
import { AssignmentDataDictT } from "../../types/assignment";
import { WorkerT } from "../../types/worker";
import { LinkShiftT } from "../../types/shift";
import SwapDetailContent from "./SwapDetailContent";
import SwapAnalysisView from "./SwapAnalysisView";
import SwapAnalysisDialog from "./SwapAnalysisDialog";
import { getEarliestAssignment } from "../../utils/assignmentSort";
import { getAssignmentsForIds } from "../../utils/swapHelpers";

interface SwapDetailDialogProps {
  open: boolean;
  onClose: () => void;
  swap: SwapRequestT | null;
  teamId?: string;
  currentUserId: string;
  currentUserWorker?: WorkerT;
  isLeader?: boolean;
  workers: WorkerT[];
  assignments: AssignmentDataDictT[];
  linkShifts: LinkShiftT[];
  reviewMode?: boolean;
  onAddBid?: (workerId: string, bidAssignmentIds: string[]) => Promise<void>;
  onAcceptBid?: (bidId: string) => Promise<void>;
  onAcceptDirectSwap?: () => Promise<void>;
  onApprove?: () => Promise<void>;
  onDeny?: () => Promise<void>;
  onRevert?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onDeleteBid?: (bidId: string) => Promise<void>;
  onCancelBidAcceptance?: () => Promise<void>;
  // Swap analysis
  onAnalyzeSwap?: (swapId: string) => Promise<void>;
  validationResult?: SwapValidationResultT | null;
  isAnalyzing?: boolean;
  onViewAnalysisDetails?: () => void;
}

export default function SwapDetailDialog({
  open,
  onClose,
  swap,
  teamId,
  currentUserId,
  currentUserWorker,
  isLeader = false,
  workers,
  assignments,
  linkShifts,
  reviewMode = false,
  onAddBid,
  onAcceptBid,
  onAcceptDirectSwap,
  onApprove,
  onDeny,
  onRevert,
  onDelete,
  onDeleteBid,
  onCancelBidAcceptance,
  onAnalyzeSwap,
  validationResult,
  isAnalyzing = false,
  onViewAnalysisDetails,
}: SwapDetailDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for add bid
  const [showAddBid, setShowAddBid] = useState(false);
  const [bidAssignmentIds, setBidAssignmentIds] = useState<string[]>([]);

  // Filter assignments for current swap using helper
  const offeredAssignments = useMemo(() => {
    if (!swap) return [];
    return getAssignmentsForIds(swap.offeredAssignmentIds, assignments);
  }, [swap, assignments]);

  // Sort bids - current user's bid first (hook moved above any early returns)
  const sortedBids = useMemo(() => {
    if (!swap || !swap.bids || !currentUserWorker) return swap?.bids ?? [];
    const userBids = swap.bids.filter(
      (bid) => bid.workerId === currentUserWorker.id,
    );
    const otherBids = swap.bids.filter(
      (bid) => bid.workerId !== currentUserWorker.id,
    );
    return [...userBids, ...otherBids];
  }, [currentUserWorker, swap]);

  const handleAddBid = async () => {
    if (!onAddBid || bidAssignmentIds.length === 0 || !currentUserWorker) {
      if (!currentUserWorker) {
        setError("Worker not found for current user");
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onAddBid(currentUserWorker.id, bidAssignmentIds);
      setShowAddBid(false);
      setBidAssignmentIds([]);
    } catch (err) {
      console.error("Failed to add bid:", err);
      setError(err instanceof Error ? err.message : "Failed to add bid");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBid = async (bidId: string) => {
    if (!onDeleteBid) return;

    try {
      setLoading(true);
      setError(null);
      await onDeleteBid(bidId);
    } catch (err) {
      console.error("Failed to delete bid:", err);
      setError(err instanceof Error ? err.message : "Failed to delete bid");
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
      onClose();
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
  const handleCancelBidAcceptance = async () => {
    if (!onCancelBidAcceptance) return;

    try {
      setLoading(true);
      setError(null);
      await onCancelBidAcceptance();
    } catch (err) {
      console.error("Failed to cancel bid acceptance:", err);
      setError(
        err instanceof Error ? err.message : "Failed to cancel bid acceptance",
      );
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

  if (!swap) {
    return null;
  }

  // Get title data (same as SwapCard)
  const earliestOffered = getEarliestAssignment(offeredAssignments);
  const titleDate = earliestOffered
    ? earliestOffered.assignment.date
    : swap.createdAt || null;
  const dayNumber =
    titleDate && typeof (titleDate as any).format === "function"
      ? titleDate.format("D")
      : "";
  const monthWeekday =
    titleDate && typeof (titleDate as any).format === "function"
      ? titleDate.format("MMM, ddd")
      : "";
  const titleShiftName = earliestOffered ? earliestOffered.shift.name : "";

  // Creator worker
  const creatorWorker =
    offeredAssignments.length > 0
      ? offeredAssignments[0].worker
      : workers.find((w) => w.userId === swap.createdByUserId) || null;

  // Determine available actions based on role and swap state
  const userHasExistingBid =
    currentUserWorker &&
    swap.bids.some((bid) => bid.workerId === currentUserWorker.id);

  const canAddBid =
    !reviewMode &&
    swap.swapType === SwapType.OPEN &&
    swap.status === SwapStatus.ACTIVE &&
    !userHasExistingBid &&
    currentUserWorker &&
    creatorWorker?.id !== currentUserWorker.id;

  const canAcceptBid =
    (!reviewMode &&
      swap.swapType === SwapType.OPEN &&
      swap.status === SwapStatus.ACTIVE &&
      swap.bids.length > 0 &&
      creatorWorker?.userId === currentUserId) ||
    isLeader;

  const canAcceptDirectSwap =
    !reviewMode &&
    swap.swapType === SwapType.DIRECT &&
    swap.status === SwapStatus.ACTIVE &&
    currentUserWorker !== undefined &&
    swap.targetWorkerId === currentUserWorker.id;

  const canApprove =
    !reviewMode && swap.status === SwapStatus.PENDING_APPROVAL && isLeader;

  const canDeny =
    !reviewMode && swap.status === SwapStatus.PENDING_APPROVAL && isLeader;

  const canRevert =
    !reviewMode && swap.status === SwapStatus.COMPLETED && isLeader;

  const canDelete =
    !reviewMode &&
    (swap.status === SwapStatus.ACTIVE ||
      swap.status === SwapStatus.PENDING_APPROVAL) &&
    (isLeader || swap.createdByUserId === currentUserId);

  const canCancelBidAcceptance =
    !reviewMode &&
    swap.status === SwapStatus.PENDING_APPROVAL &&
    swap.swapType === SwapType.OPEN &&
    (isLeader || swap.createdByUserId === currentUserId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      data-testid="swap-detail-dialog"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {/* Title matching SwapCard format */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "baseline",
                mr: 2,
              }}
            >
              <Typography
                variant="h5"
                component="div"
                sx={{ lineHeight: 1, mr: isMobile ? 0 : "5px" }}
              >
                {dayNumber}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: "nowrap" }}
              >
                {monthWeekday}
              </Typography>
            </Box>
            <Typography variant="h6" component="div" fontWeight={700}>
              {titleShiftName}
              {offeredAssignments.length > 1 ? "..." : ""}
            </Typography>
          </Box>
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
          <SwapDetailContent
            swap={swap}
            currentUserId={currentUserId}
            isLeader={isLeader}
            workers={workers}
            assignments={assignments}
            linkShifts={linkShifts}
            reviewMode={reviewMode}
            showTitle={false}
            loading={loading}
            error={error}
            showAddBid={showAddBid}
            bidAssignmentIds={bidAssignmentIds}
            onToggleAddBid={() => setShowAddBid(!showAddBid)}
            onBidAssignmentChange={setBidAssignmentIds}
            onSubmitBid={handleAddBid}
            onDeleteBid={onDeleteBid ? handleDeleteBid : undefined}
            onAcceptBid={handleAcceptBid}
            onCancelBidAcceptance={
              onCancelBidAcceptance ? handleCancelBidAcceptance : undefined
            }
            currentUserWorker={currentUserWorker}
            canAddBid={canAddBid}
            canAcceptBid={canAcceptBid}
            canCancelBidAcceptance={canCancelBidAcceptance}
            sortedBids={sortedBids}
            onAnalyzeSwap={
              onAnalyzeSwap && swap ? () => onAnalyzeSwap(swap.id) : undefined
            }
            isAnalyzing={isAnalyzing}
            validationResult={validationResult}
            onViewAnalysisDetails={onViewAnalysisDetails}
          />
        )}

        {/* Swap Analysis View */}
        {validationResult && (
          <SwapAnalysisView
            validationResult={validationResult}
            assignments={assignments}
            onViewDetails={() => onViewAnalysisDetails?.()}
          />
        )}
      </DialogContent>
      {!reviewMode && (
        <DialogActions>
          <Box
            display="flex"
            justifyContent="space-between"
            width="100%"
            px={1}
            flexDirection={isMobile ? "column" : "row"}
            gap={1}
          >
            <Box display="flex" gap={1} flexWrap="wrap">
              {canDelete && (
                <Button
                  onClick={handleDelete}
                  color="error"
                  disabled={loading}
                  data-testid="delete-swap-button"
                  size={isMobile ? "small" : "medium"}
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
                  size={isMobile ? "small" : "medium"}
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
                  size={isMobile ? "small" : "medium"}
                >
                  Revert Swap
                </Button>
              )}
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                onClick={onClose}
                disabled={loading}
                data-testid="close-button"
                size={isMobile ? "small" : "medium"}
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
                  size={isMobile ? "small" : "medium"}
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
                  size={isMobile ? "small" : "medium"}
                >
                  Approve Swap
                </Button>
              )}
            </Box>
          </Box>
        </DialogActions>
      )}
    </Dialog>
  );
}
