"use client";

import React from "react";
import {
  Box,
  Typography,
  Chip,
  Divider,
  Paper,
  Alert,
  IconButton,
  Button,
  Collapse,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { SwapRequestT, SwapType, SwapStatus } from "../../types/swap";
import { AssignmentDataDictT } from "../../types/assignment";
import { WorkerT } from "../../types/worker";
import { LinkShiftT } from "../../types/shift";
import AssignmentSelector from "./AssignmentSelector";
import AssignmentList from "./AssignmentList";
import { getEarliestAssignment } from "../../utils/assignmentSort";
import { getWorkerName, getWorkerByUserId } from "../../utils/workerHelpers";
import { getAssignmentsForIds } from "../../utils/swapHelpers";

interface SwapDetailContentProps {
  swap: SwapRequestT;
  currentUserId: string;
  isLeader?: boolean;
  workers: WorkerT[];
  assignments: AssignmentDataDictT[];
  linkShifts: LinkShiftT[];
  reviewMode?: boolean;
  showTitle?: boolean;
  // Actions
  loading?: boolean;
  error?: string | null;
  showAddBid?: boolean;
  bidAssignmentIds?: string[];
  onToggleAddBid?: () => void;
  onBidAssignmentChange?: (ids: string[]) => void;
  onSubmitBid?: () => void;
  onDeleteBid?: (bidId: string) => void;
  onAcceptBid?: (bidId: string) => void;
  currentUserWorker?: WorkerT | undefined;
  canAddBid?: boolean;
  canAcceptBid?: boolean;
  sortedBids?: any[];
}

export default function SwapDetailContent({
  swap,
  currentUserId,
  isLeader = false,
  workers,
  assignments,
  linkShifts,
  reviewMode = false,
  showTitle = false,
  loading = false,
  error = null,
  showAddBid = false,
  bidAssignmentIds = [],
  onToggleAddBid,
  onBidAssignmentChange,
  onSubmitBid,
  onDeleteBid,
  onAcceptBid,
  currentUserWorker,
  canAddBid = false,
  canAcceptBid = false,
  sortedBids = [],
}: SwapDetailContentProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Get assignments
  const offeredAssignments = getAssignmentsForIds(
    swap.offeredAssignmentIds,
    assignments,
  );

  const requestedAssignments =
    swap.swapType === SwapType.DIRECT && swap.requestedAssignmentIds
      ? getAssignmentsForIds(swap.requestedAssignmentIds, assignments)
      : [];

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

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="error-alert">
          {error}
        </Alert>
      )}

      {/* Title (optional) */}
      {showTitle && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
          }}
        >
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
      )}

      {/* Status and Type Chips */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Chip
          label={
            swap.swapType === SwapType.DIRECT ? "Direct Swap" : "Open Swap"
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

      {/* Worker */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Worker
        </Typography>
        <Typography variant="body1">
          {creatorWorker?.name || "Unknown Worker"}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Offered Assignments */}
      <Box sx={{ mb: 2 }} data-testid="offered-assignments-section">
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Offered Assignments ({offeredAssignments.length})
        </Typography>
        <AssignmentList
          assignments={offeredAssignments}
          maxDisplayed={reviewMode ? 999 : 5}
          showTimes={true}
          isMobile={isMobile}
        />
      </Box>

      {/* Requested Assignments (Direct Swap) */}
      {swap.swapType === SwapType.DIRECT &&
        swap.targetWorkerId &&
        requestedAssignments.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }} data-testid="requested-assignments-section">
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Requested Assignments ({requestedAssignments.length})
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                From: {getWorkerName(swap.targetWorkerId, workers)}
              </Typography>
              <AssignmentList
                assignments={requestedAssignments}
                maxDisplayed={reviewMode ? 999 : 5}
                showTimes={true}
                isMobile={isMobile}
              />
            </Box>
          </>
        )}

      {/* Bids Section (Open Swaps Only, not in review mode) */}
      {!reviewMode && swap.swapType === SwapType.OPEN && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Bids ({swap.bids.length})
            </Typography>

            {/* Add Bid UI */}
            {canAddBid && onToggleAddBid && (
              <Box sx={{ mb: 2 }}>
                <Button
                  onClick={onToggleAddBid}
                  variant={showAddBid ? "outlined" : "contained"}
                  size="small"
                  data-testid="toggle-bid-button"
                >
                  {showAddBid ? "Cancel" : "Create Bid"}
                </Button>

                <Collapse in={showAddBid}>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Select your assignments to bid:
                    </Typography>
                    {onBidAssignmentChange && (
                      <AssignmentSelector
                        selectedAssignmentIds={bidAssignmentIds}
                        onSelectionChange={onBidAssignmentChange}
                        assignments={assignments.filter(
                          (a) =>
                            currentUserWorker &&
                            a.assignment.workerId === currentUserWorker.id &&
                            !swap.offeredAssignmentIds.includes(
                              a.assignment.id,
                            ) &&
                            a.assignment.date.isAfter(dayjs(), "day"),
                        )}
                        linkShifts={linkShifts}
                        allowMultiple={true}
                      />
                    )}
                    {onSubmitBid && (
                      <Button
                        onClick={onSubmitBid}
                        variant="contained"
                        disabled={bidAssignmentIds.length === 0 || loading}
                        sx={{ mt: 2 }}
                        data-testid="submit-bid-button"
                      >
                        Submit Bid
                      </Button>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}

            {/* Bids List */}
            {sortedBids.length === 0 ? (
              <Alert severity="info">No bids yet</Alert>
            ) : (
              <Box>
                {sortedBids.map((bid) => {
                  const isUserBid =
                    currentUserWorker && bid.workerId === currentUserWorker.id;
                  const bidAssignments = getAssignmentsForIds(
                    bid.offeredAssignmentIds,
                    assignments,
                  );

                  return (
                    <Paper
                      key={bid.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        bgcolor: isUserBid ? "primary.50" : "background.paper",
                        border: isUserBid ? "2px solid" : "1px solid",
                        borderColor: isUserBid ? "primary.main" : "divider",
                      }}
                      data-testid={`bid-item-${bid.id}`}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 1,
                        }}
                      >
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body1" fontWeight={600}>
                              {getWorkerName(bid.workerId, workers)}
                            </Typography>
                            {isUserBid && (
                              <Chip
                                label="Your Bid"
                                size="small"
                                color="primary"
                              />
                            )}
                            {bid.accepted && (
                              <Chip
                                label="Accepted"
                                size="small"
                                color="success"
                                data-testid={`bid-accepted-chip-${bid.id}`}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {bid.createdAt.format("MMM D, YYYY HH:mm")}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", gap: 1 }}>
                          {isUserBid && onDeleteBid && (
                            <IconButton
                              size="small"
                              onClick={() => onDeleteBid(bid.id)}
                              disabled={loading}
                              color="error"
                              data-testid={`delete-bid-button-${bid.id}`}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                          {canAcceptBid && !bid.accepted && onAcceptBid && (
                            <IconButton
                              size="small"
                              onClick={() => onAcceptBid(bid.id)}
                              disabled={loading}
                              color="primary"
                              data-testid={`accept-bid-button-${bid.id}`}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        Bid Assignments:
                      </Typography>
                      <AssignmentList
                        assignments={bidAssignments}
                        maxDisplayed={5}
                        showTimes={true}
                        isMobile={isMobile}
                      />
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Comment */}
      {swap.comment && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Comment
            </Typography>
            <Typography variant="body2">{swap.comment}</Typography>
          </Box>
        </>
      )}

      {/* Metadata */}
      {!reviewMode && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="caption" color="text.secondary">
              Created: {swap.createdAt?.format("MMM D, YYYY HH:mm")}
            </Typography>
            {swap.completedAt && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Completed: {swap.completedAt.format("MMM D, YYYY HH:mm")}
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* Audit Trail (if completed) */}
      {!reviewMode &&
        swap.status === SwapStatus.COMPLETED &&
        swap.auditData.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Audit Trail
              </Typography>
              {swap.auditData.map((audit, index) => (
                <Paper key={index} sx={{ p: 2, mb: 1 }}>
                  <Typography variant="body2">
                    Assignment ID: {audit.assignmentId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Worker: {getWorkerName(audit.workerId, workers)}
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
          </>
        )}
    </Box>
  );
}
