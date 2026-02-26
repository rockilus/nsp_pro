"use client";

import { useState, useEffect } from "react";
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
  CircularProgress,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import SwapAnalysisView from "./SwapAnalysisView";
import dayjs from "dayjs";
import { SwapRequestT, SwapType, SwapStatus } from "../../types/swap";
import { AssignmentDataDictT } from "../../types/assignment";
import { WorkerT } from "../../types/worker";
import { LinkShiftT } from "../../types/shift";
import AssignmentSelector from "./AssignmentSelector";
import AssignmentList from "./AssignmentList";
import { getEarliestAssignment } from "../../utils/assignmentSort";
import { formatSwapTitleDate } from "../../utils/swapHelpers";
import { getWorkerName } from "../../utils/workerHelpers";
import { getAssignmentsForIds } from "../../utils/swapHelpers";
import { useTranslation } from "../../app/i18n/client";

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
  onCancelBidAcceptance?: () => void;
  currentUserWorker?: WorkerT | undefined;
  canAddBid?: boolean;
  canAcceptBid?: boolean;
  canCancelBidAcceptance?: boolean;
  sortedBids?: any[];
  // Swap analysis
  onAnalyzeSwap?: () => void;
  isAnalyzing?: boolean;
  validationResult?: any;
  onViewAnalysisDetails?: () => void;
  lng: string;
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
  onCancelBidAcceptance,
  currentUserWorker,
  canAddBid = false,
  canAcceptBid = false,
  canCancelBidAcceptance = false,
  sortedBids = [],
  onAnalyzeSwap,
  isAnalyzing = false,
  validationResult,
  onViewAnalysisDetails,
  lng,
}: SwapDetailContentProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation(lng, "swap-page");
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Show analysis when validation result is available
  const displayAnalysis = showAnalysis && validationResult;

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
  const { dayNumber, monthWeekday } = formatSwapTitleDate(titleDate, lng);
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
            swap.swapType === SwapType.DIRECT
              ? t("type_direct")
              : t("type_open")
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
          {t("lbl_worker")}
        </Typography>
        <Typography variant="body1">
          {creatorWorker?.name || t("lbl_unknown_worker")}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Offered Assignments */}
      <Box sx={{ mb: 2 }} data-testid="offered-assignments-section">
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t("lbl_offered_count", { count: offeredAssignments.length })}
        </Typography>
        <AssignmentList
          assignments={offeredAssignments}
          maxDisplayed={reviewMode ? 999 : 5}
          showTimes={true}
          isMobile={isMobile}
          testIdPrefix={`swap-detail-${swap.id}-assignment`}
          lng={lng}
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
                {t("lbl_requested_count", {
                  count: requestedAssignments.length,
                })}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mb: 1 }}
                data-testid="target-worker-name"
              >
                {t("lbl_from_worker", {
                  workerName: getWorkerName(swap.targetWorkerId!, workers),
                })}
              </Typography>
              <AssignmentList
                assignments={requestedAssignments}
                maxDisplayed={reviewMode ? 999 : 5}
                showTimes={true}
                isMobile={isMobile}
                testIdPrefix={`swap-detail-${swap.id}-assignment`}
                lng={lng}
              />
            </Box>
          </>
        )}

      {/* Bids Section (Open Swaps Only, not in review mode) */}
      {!reviewMode && swap.swapType === SwapType.OPEN && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }} data-testid="bids-section">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t("lbl_bids_count", { count: swap.bids.length })}
            </Typography>

            {/* Add Bid UI */}
            {canAddBid && onToggleAddBid && (
              <Box sx={{ mb: 2 }}>
                <Button
                  onClick={onToggleAddBid}
                  variant={showAddBid ? "outlined" : "contained"}
                  size="small"
                  data-testid={
                    showAddBid ? "cancel-add-bid-button" : "add-bid-button"
                  }
                >
                  {showAddBid ? t("btn_cancel_bid") : t("btn_create_bid")}
                </Button>

                <Collapse in={showAddBid}>
                  <Box sx={{ mt: 2 }} data-testid="add-bid-section">
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {t("lbl_select_bid_assignments")}
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
                        lng={lng}
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
                        {t("btn_submit_bid")}
                      </Button>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}

            {/* Bids List */}
            {sortedBids.length === 0 ? (
              <Alert severity="info">{t("lbl_no_bids")}</Alert>
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
                          mb: "4px",
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
                                label={t("lbl_your_bid")}
                                size="small"
                                color="primary"
                              />
                            )}
                            {bid.accepted && (
                              <Chip
                                label={t("lbl_accepted")}
                                size="small"
                                color="success"
                                data-testid={`bid-accepted-chip-${bid.id}`}
                              />
                            )}
                          </Box>
                          {/* <Typography variant="caption" color="text.secondary">
                            {bid.createdAt.format("MMM D, YYYY HH:mm")}
                          </Typography> */}
                        </Box>

                        <Box sx={{ display: "flex", gap: 1 }}>
                          {isUserBid && !bid.accepted && onDeleteBid && (
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
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => onAcceptBid(bid.id)}
                              disabled={loading}
                              color="primary"
                              data-testid={`accept-bid-button-${bid.id}`}
                              sx={{ textTransform: "none" }}
                            >
                              {t("lbl_accept_bid")}
                            </Button>
                          )}
                        </Box>
                      </Box>

                      {/* <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        Bid Assignments:
                      </Typography> */}
                      <AssignmentList
                        assignments={bidAssignments}
                        maxDisplayed={5}
                        showTimes={true}
                        isMobile={isMobile}
                        testIdPrefix={`swap-detail-${swap.id}-bid-${bid.id}-assignment`}
                        lng={lng}
                      />

                      {bid.accepted &&
                        canCancelBidAcceptance &&
                        onCancelBidAcceptance && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={onCancelBidAcceptance}
                            disabled={loading}
                            color="warning"
                            data-testid="cancel-bid-acceptance-button"
                            sx={{ textTransform: "none" }}
                          >
                            {t("lbl_revert_to_open")}
                          </Button>
                        )}
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
              {t("lbl_comment")}
            </Typography>
            <Typography variant="body2">{swap.comment}</Typography>
          </Box>
        </>
      )}

      {/* Swap Analysis - only for leaders and PENDING_APPROVAL status */}
      {!reviewMode &&
        isLeader &&
        swap.status === SwapStatus.PENDING_APPROVAL &&
        onAnalyzeSwap && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }}>
              {!displayAnalysis ? (
                <Button
                  variant="contained"
                  color="info"
                  onClick={() => {
                    onAnalyzeSwap?.();
                    setShowAnalysis(true);
                  }}
                  disabled={isAnalyzing}
                  fullWidth={isMobile}
                  data-testid="analyze-swap-button"
                  sx={{ textTransform: "none" }}
                >
                  {isAnalyzing ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      {t("btn_analyzing")}
                    </>
                  ) : (
                    t("btn_analyze")
                  )}
                </Button>
              ) : (
                <SwapAnalysisView
                  validationResult={validationResult}
                  assignments={assignments}
                  onViewDetails={() => onViewAnalysisDetails?.()}
                  lng={lng}
                />
              )}
            </Box>
          </>
        )}

      {/* Metadata */}
      {!reviewMode && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("lbl_created", {
                date: swap.createdAt?.format("MMM D, YYYY HH:mm"),
              })}
            </Typography>
            {swap.completedAt && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {t("lbl_completed", {
                  date: swap.completedAt.format("MMM D, YYYY HH:mm"),
                })}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
