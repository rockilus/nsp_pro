"use client";

import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  SwapValidationResultT,
  AssignmentImplicationT,
} from "../../types/swapValidation";
import { AssignmentDataDictT } from "../../types/assignment";
import {
  MostConstrainingReasonT,
  ReplacementCategoryT,
} from "../../types/replacement";
import {
  getCategoryEmoji,
  getReasonLabel,
} from "../../utils/replacementHelpers";
import dayjs from "dayjs";
import { useTranslation } from "../../app/i18n/client";
import { buildSwapValidationMessage } from "./swapValidationMessages";

interface SwapAnalysisViewProps {
  validationResult: SwapValidationResultT;
  assignments: AssignmentDataDictT[];
  onViewDetails: () => void;
  lng: string;
}

export default function SwapAnalysisView({
  validationResult,
  assignments,
  onViewDetails,
  lng,
}: SwapAnalysisViewProps) {
  const { t } = useTranslation(lng, "swap-page");
  const workerAInfo = validationResult.workerAInfo;
  const workerBInfo = validationResult.workerBInfo;

  const validationMessage = buildSwapValidationMessage(
    validationResult.validationKey,
    workerAInfo,
    workerBInfo,
    t,
  );

  const getAssignmentData = (assignmentId: string) => {
    return assignments.find((a) => a.assignment.id === assignmentId);
  };

  const renderWorkerAnalysis = (
    workerName: string,
    postSwap: AssignmentImplicationT[],
  ) => {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {workerName}
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Will receive {postSwap.length} assignment(s)
        </Typography>

        <List dense sx={{ mt: 2 }}>
          {postSwap.map((assignmentImplication) => {
            const assignmentData = getAssignmentData(
              assignmentImplication.assignmentId,
            );
            const emoji = getCategoryEmoji(
              assignmentImplication.replacementCategory,
            );
            const reason = getReasonLabel(
              assignmentImplication.mostConstrainingReason,
              t,
            );

            const weeklyDelta = Math.round(
              assignmentImplication.implications.newWeeklyTime
                .newWeeklyTimeDeltaMinutes / 60,
            );
            const dutiesDelta =
              assignmentImplication.implications.newMonthlyDuties
                .newMonthlyDutiesDelta;

            return (
              <ListItem
                key={assignmentImplication.assignmentId}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: "background.paper",
                }}
              >
                <ListItemText
                  slotProps={{
                    primary: { component: "div" },
                    secondary: { component: "div" },
                  }}
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
      {/* Title and Details Button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Swap Analysis
        </Typography>
        <Button
          variant="contained"
          onClick={onViewDetails}
          sx={{ textTransform: "none" }}
          data-testid="view-analysis-details-button"
        >
          See Details
        </Button>
      </Box>

      {/* Validation Status */}
      <Alert
        severity={validationResult.isValid ? "success" : "warning"}
        sx={{ mb: 2 }}
        data-testid="validation-status-alert"
      >
        {validationMessage}
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
          {renderWorkerAnalysis(workerAInfo.workerName, workerAInfo.postSwap)}
        </Box>
        <Box sx={{ flex: 1 }}>
          {renderWorkerAnalysis(workerBInfo.workerName, workerBInfo.postSwap)}
        </Box>
      </Box>
    </Box>
  );
}
