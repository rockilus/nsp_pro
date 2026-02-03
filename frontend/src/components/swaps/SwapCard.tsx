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
  onClick: (swap: SwapRequestT) => void;
}

export default function SwapCard({
  swap,
  offeredAssignments,
  requestedAssignments,
  creatorWorker,
  onClick,
}: SwapCardProps) {
  const createdAtLabel =
    swap.createdAt && typeof (swap as any).createdAt?.format === "function"
      ? (swap as any).createdAt.format("MMM D, YYYY")
      : String(swap.createdAt ?? "");

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
        "&:hover": {
          boxShadow: 4,
          transform: "translateY(-2px)",
        },
      }}
      data-testid={`swap-card-${swap.id}`}
    >
      <CardContent>
        {/* Header with type and status */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
          }}
        >
          <Typography variant="subtitle1" component="div" fontWeight={600}>
            {swapTypeLabels[swap.swapType]}
          </Typography>
          <Chip
            label={statusLabels[swap.status]}
            color={statusColors[swap.status]}
            size="small"
          />
        </Box>

        {/* Creator and metadata */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Created by:</strong> {creatorWorker?.name || "Unknown"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {createdAtLabel}
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

        {/* Offered Assignments */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            color="text.primary"
            sx={{ mb: 1 }}
          >
            Offering:
          </Typography>
          {displayedOffered.length > 0 ? (
            displayedOffered.map((data) => (
              <Box
                key={data.assignment.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  mb: 1,
                  pl: 1,
                  borderLeft: "3px solid",
                  borderColor: "primary.main",
                }}
              >
                <Typography variant="body2">
                  {data.assignment.date.format("MMM D, YYYY")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.shift.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.shift.startTime.format("HH:mm")} -{" "}
                  {data.shift.endTime.format("HH:mm")}
                </Typography>
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
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="text.primary"
                  sx={{ mb: 1 }}
                >
                  Requesting:
                </Typography>
                {displayedRequested.length > 0 ? (
                  displayedRequested.map((data) => (
                    <Box
                      key={data.assignment.id}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        mb: 1,
                        pl: 1,
                        borderLeft: "3px solid",
                        borderColor: "secondary.main",
                      }}
                    >
                      <Typography variant="body2">
                        {data.assignment.date.format("MMM D, YYYY")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {data.shift.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.shift.startTime.format("HH:mm")} -{" "}
                        {data.shift.endTime.format("HH:mm")}
                      </Typography>
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

        {/* Comment */}
        {swap.comment && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              &ldquo;{swap.comment}&rdquo;
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
