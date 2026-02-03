"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Typography,
} from "@mui/material";
import { SwapRequestT, SwapStatus, SwapType } from "../../types/swap";
import { AssignmentDataDictT } from "../../types/assignment";
import { WorkerT } from "../../types/worker";
import AssignmentOfferItem from "./AssignmentOfferItem";
import { getEarliestAssignment } from "../../utils/assignmentSort";

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

const swapTypeLabels: Record<SwapType, string> = {
  [SwapType.DIRECT]: "Direct Swap",
  [SwapType.OPEN]: "Open Swap",
};

interface SwapCardProps {
  swap: SwapRequestT;
  offeredAssignments: AssignmentDataDictT[];
  requestedAssignments?: AssignmentDataDictT[];
  creatorWorker: WorkerT | null;
  isMobile: boolean;
  onClick: (swap: SwapRequestT) => void;
}

export default function SwapCard({
  swap,
  offeredAssignments,
  requestedAssignments,
  creatorWorker,
  isMobile,
  onClick,
}: SwapCardProps) {
  const createdAtLabel =
    swap.createdAt && typeof (swap as any).createdAt?.format === "function"
      ? (swap as any).createdAt.format("MMM D, YYYY")
      : String(swap.createdAt ?? "");

  // Determine earliest offered assignment for title
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

  const MAX_DISPLAYED_ASSIGNMENTS = 3;
  const displayedOffered = offeredAssignments.slice(
    0,
    MAX_DISPLAYED_ASSIGNMENTS,
  );
  const remainingOfferedCount = Math.max(
    0,
    offeredAssignments.length - MAX_DISPLAYED_ASSIGNMENTS,
  );

  const displayedRequested =
    requestedAssignments?.slice(0, MAX_DISPLAYED_ASSIGNMENTS) || [];
  const remainingRequestedCount = Math.max(
    0,
    (requestedAssignments?.length || 0) - MAX_DISPLAYED_ASSIGNMENTS,
  );

  return (
    <Card
      key={swap.id}
      onClick={() => onClick(swap)}
      sx={{
        mb: 2,
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        // backgroundColor: "#1976d20a",
        boxShadow: "none",
        "&:hover": {
          //   backgroundColor: "#1976d214", //1976d214
        },
      }}
      data-testid={`swap-card-${swap.id}`}
    >
      <CardContent>
        {/* Title: earliest offered date (big day) + shift name; status chip on right */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
          }}
        >
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

            <Box
              sx={{
                minWidth: 0,
                alignSelf: isMobile ? "flex-start" : "center",
              }}
            >
              <Typography
                variant="h6"
                component="div"
                fontWeight={700}
                sx={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {titleShiftName}
                {offeredAssignments.length > 1 ? "..." : ""}
              </Typography>
              {/* <Typography variant="caption" color="text.secondary">
                {swapTypeLabels[swap.swapType]}
              </Typography> */}
            </Box>
          </Box>

          {/* On desktop keep chip at right; on mobile render it under the title */}
          {!isMobile && (
            <Chip
              label={statusLabels[swap.status]}
              color={statusColors[swap.status]}
              size="small"
            />
          )}
        </Box>
        {/* Offered Assignments */}
        <Box sx={{ mb: 2 }}>
          {displayedOffered.length > 0 ? (
            displayedOffered.map((data) => (
              <Box key={data.assignment.id} sx={{ mb: 1 }}>
                <AssignmentOfferItem
                  data={data}
                  showTimes={true}
                  isMobile={isMobile}
                />
              </Box>
            ))
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
              {offeredAssignments.length} assignment(s)
            </Typography>
          )}
          {remainingOfferedCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
              + {remainingOfferedCount} more
            </Typography>
          )}
        </Box>
        {/* Requested Assignments (for direct swaps) */}
        {swap.swapType === SwapType.DIRECT &&
          requestedAssignments &&
          requestedAssignments.length > 0 && (
            <>
              <Box>
                <Typography
                  variant="body2"
                  //   fontWeight={600}
                  color="text.primary"
                  sx={{ mb: 1 }}
                >
                  Requesting:
                </Typography>
                {displayedRequested.length > 0 ? (
                  displayedRequested.map((data) => (
                    <Box key={data.assignment.id} sx={{ mb: 1 }}>
                      <AssignmentOfferItem
                        data={data}
                        showTimes={true}
                        isMobile={isMobile}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ pl: 1 }}
                  >
                    {requestedAssignments.length} assignment(s)
                  </Typography>
                )}
                {remainingRequestedCount > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ pl: 1 }}
                  >
                    + {remainingRequestedCount} more
                  </Typography>
                )}
              </Box>
            </>
          )}
        {/* Creator and metadata */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {creatorWorker?.name || "Unknown"}
          </Typography>
          {swap.swapType === SwapType.OPEN && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              <strong>{swap.bids.length}</strong>{" "}
              {swap.bids.length === 1 ? "bid" : "bids"}
            </Typography>
          )}
        </Box>

        {/* Mobile: status chip below title */}
        {isMobile && (
          <Box sx={{ mb: 1 }}>
            <Chip
              label={statusLabels[swap.status]}
              color={statusColors[swap.status]}
              size="small"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
