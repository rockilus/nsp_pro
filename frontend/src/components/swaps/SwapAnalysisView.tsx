"use client";

import {
  Box,
  Typography,
  Button,
  Divider,
  Paper,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { SwapValidationResultT } from "../../types/swapValidation";
import { AssignmentDataDictT } from "../../types/assignment";
import {
  MostConstrainingReasonT,
  ReplacementImplicationsT,
} from "../../types/replacement";
import dayjs from "dayjs";

interface SwapAnalysisViewProps {
  validationResult: SwapValidationResultT;
  assignments: AssignmentDataDictT[];
  onViewDetails: () => void;
}

const getCategoryEmoji = (implications: ReplacementImplicationsT): string => {
  // Determine category based on implications
  if (
    !implications.isEmployed ||
    !implications.hasSpecialty ||
    !implications.isntOnLeave ||
    !implications.filterHits.isntFilteredOut ||
    !implications.overlapHits.hasntOverlap ||
    !implications.hardConstraintHits.meetsConstraints ||
    !implications.requestHits.hasNoRequestConflict
  ) {
    return "🔴"; // cant_do
  }

  if (!implications.softConstraintHits.meetsConstraints) {
    return "🟠"; // could_do
  }

  return "🟢"; // can_do
};

const getMostConstrainingReason = (
  implications: ReplacementImplicationsT,
): string => {
  if (!implications.isEmployed) return "Not employed";
  if (!implications.hasSpecialty) return "Missing specialty";
  if (!implications.isntOnLeave) return "On leave";
  if (!implications.filterHits.isntFilteredOut) return "Filtered out";
  if (!implications.overlapHits.hasntOverlap) return "Has overlap";
  if (!implications.hardConstraintHits.meetsConstraints)
    return "Hard constraint violation";
  if (!implications.requestHits.hasNoRequestConflict) return "Request conflict";
  if (!implications.softConstraintHits.meetsConstraints)
    return "Soft constraint violation";
  return "No constraints violated";
};

export default function SwapAnalysisView({
  validationResult,
  assignments,
  onViewDetails,
}: SwapAnalysisViewProps) {
  const workerAInfo = validationResult.workerAInfo;
  const workerBInfo = validationResult.workerBInfo;

  const getAssignmentData = (assignmentId: string) => {
    return assignments.find((a) => a.assignment.id === assignmentId);
  };

  const renderWorkerAnalysis = (
    workerName: string,
    assignmentIds: string[],
    currentImplications: ReplacementImplicationsT[],
    swappedImplications: ReplacementImplicationsT[],
    label: string,
  ) => {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {label}: {workerName}
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Will receive {swappedImplications.length} assignment(s)
        </Typography>

        <List dense sx={{ mt: 2 }}>
          {swappedImplications.map((implications, index) => {
            const assignmentId = assignmentIds[index];
            const assignmentData = getAssignmentData(assignmentId);
            const emoji = getCategoryEmoji(implications);
            const reason = getMostConstrainingReason(implications);

            const weeklyDelta = Math.round(
              implications.newWeeklyTime.newWeeklyTimeDeltaMinutes / 60,
            );
            const dutiesDelta =
              implications.newMonthlyDuties.newMonthlyDutiesDelta;

            return (
              <ListItem
                key={assignmentId}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: "background.paper",
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2">
                        {emoji} {assignmentData?.shift.name || "Unknown"} -{" "}
                        {assignmentData
                          ? dayjs(assignmentData.assignment.date).format(
                              "MMM D, ddd",
                            )
                          : ""}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" display="block">
                        {reason}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Weekly hours: {weeklyDelta > 0 ? "+" : ""}
                        {weeklyDelta}h | Monthly duties:{" "}
                        {dutiesDelta > 0 ? "+" : ""}
                        {dutiesDelta}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>
    );
  };

  return (
    <Box>
      <Divider sx={{ my: 2 }} />

      {/* Validation Status */}
      <Alert
        severity={validationResult.isValid ? "success" : "warning"}
        sx={{ mb: 2 }}
        data-testid="validation-status-alert"
      >
        {validationResult.validationMessage}
      </Alert>

      {/* Worker Analyses */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          {renderWorkerAnalysis(
            workerAInfo.workerName,
            workerAInfo.assignmentIds,
            workerAInfo.currentImplications,
            workerAInfo.swappedImplications,
            "Worker A",
          )}
        </Box>
        <Box sx={{ flex: 1 }}>
          {renderWorkerAnalysis(
            workerBInfo.workerName,
            workerBInfo.assignmentIds,
            workerBInfo.currentImplications,
            workerBInfo.swappedImplications,
            "Worker B",
          )}
        </Box>
      </Box>

      {/* See Details Button */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Button
          variant="contained"
          onClick={onViewDetails}
          sx={{ textTransform: "none" }}
          data-testid="view-analysis-details-button"
        >
          See Details
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />
    </Box>
  );
}
