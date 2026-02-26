"use client";

import { Box, Typography } from "@mui/material";
import { AssignmentDataDictT } from "../../types/assignment";
import AssignmentOfferItem from "./AssignmentOfferItem";
import { useTranslation } from "../../app/i18n/client";

interface AssignmentListProps {
  assignments: AssignmentDataDictT[];
  maxDisplayed?: number;
  showTimes?: boolean;
  isMobile?: boolean;
  testIdPrefix?: string;
  emptyMessage?: string;
  lng: string;
}

export default function AssignmentList({
  assignments,
  maxDisplayed = 3,
  showTimes = true,
  isMobile = false,
  testIdPrefix,
  emptyMessage,
  lng,
}: AssignmentListProps) {
  const { t } = useTranslation(lng, "swap-page");

  if (assignments.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
        {emptyMessage ?? t("list_no_assignments")}
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
              testId={`${testIdPrefix ?? "assignment-offer-item"}-${data.assignment.id}`}
            />
          </Box>
        ))}
      </Box>
      {remainingCount > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
          {t("list_more", { count: remainingCount })}
        </Typography>
      )}
    </Box>
  );
}
