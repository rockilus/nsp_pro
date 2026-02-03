"use client";

import { Box, Typography } from "@mui/material";
import { AssignmentDataDictT } from "../../types/assignment";
import AssignmentOfferItem from "./AssignmentOfferItem";

interface AssignmentListProps {
  assignments: AssignmentDataDictT[];
  maxDisplayed?: number;
  showTimes?: boolean;
  isMobile?: boolean;
  emptyMessage?: string;
}

export default function AssignmentList({
  assignments,
  maxDisplayed = 3,
  showTimes = true,
  isMobile = false,
  emptyMessage = "No assignments",
}: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
        {emptyMessage}
      </Typography>
    );
  }

  const displayedAssignments = assignments.slice(0, maxDisplayed);
  const remainingCount = Math.max(0, assignments.length - maxDisplayed);

  return (
    <Box>
      <Box
        sx={{
          display: isMobile ? "block" : "flex",
          flexDirection: isMobile ? "column" : "row",
          flexWrap: isMobile ? "nowrap" : "wrap",
          gap: isMobile ? 0 : 1,
        }}
      >
        {displayedAssignments.map((data) => (
          <Box key={data.assignment.id} sx={{ mb: isMobile ? 1 : 0 }}>
            <AssignmentOfferItem
              data={data}
              showTimes={showTimes}
              isMobile={isMobile}
            />
          </Box>
        ))}
      </Box>
      {remainingCount > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
          + {remainingCount} more
        </Typography>
      )}
    </Box>
  );
}
