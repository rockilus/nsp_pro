"use client";

import React from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Typography,
} from "@mui/material";
import { SwapRequestT, SwapStatus, SwapType } from "../../types/swap";

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

interface SwapCardProps {
  swap: SwapRequestT;
  isLeader: boolean;
  onViewDetails: (swap: SwapRequestT) => void;
  onApprove?: (swapId: string) => Promise<void> | void;
}

export default function SwapCard({
  swap,
  isLeader,
  onViewDetails,
  onApprove,
}: SwapCardProps) {
  const createdAtLabel =
    swap.createdAt && typeof (swap as any).createdAt?.format === "function"
      ? (swap as any).createdAt.format("MMM D, YYYY")
      : String(swap.createdAt ?? "");

  return (
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
              Created {createdAtLabel}
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
            <strong>Requesting:</strong> {swap.requestedAssignmentIds.length}{" "}
            assignment(s)
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
          onClick={() => onViewDetails(swap)}
          data-testid={`view-details-button-${swap.id}`}
        >
          View Details
        </Button>

        {swap.status === SwapStatus.ACTIVE &&
          swap.swapType === SwapType.OPEN && (
            <Button
              size="small"
              color="primary"
              onClick={() => onViewDetails(swap)}
            >
              Add Bid
            </Button>
          )}

        {swap.status === SwapStatus.PENDING_APPROVAL && isLeader && (
          <Button
            size="small"
            color="success"
            onClick={async () => {
              if (!onApprove) return;
              try {
                await onApprove(swap.id);
              } catch (err) {
                // allow parent to handle errors
              }
            }}
          >
            Approve
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
