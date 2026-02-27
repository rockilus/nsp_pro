"use client";

import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  SwapValidationResultT,
  AssignmentImplicationT,
} from "../../types/swapValidation";
import { AssignmentDataDictT } from "../../types/assignment";
import {
  getCategoryEmoji,
  getReasonLabel,
  formatShiftTimeRange,
  formatWeeklyTime,
  formatMonthlyDuties,
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
          {t("analysis_will_receive", { count: postSwap.length })}
        </Typography>

        <List dense>
          {postSwap.map((assignmentImplication, idx) => {
            const isLast = idx === postSwap.length - 1;
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

            const shift = assignmentData?.shift;
            const assignment = assignmentData?.assignment;
            const dateLabel = assignment?.date
              ? dayjs(assignment.date).format("D MMM, ddd")
              : "";
            const timeRange = formatShiftTimeRange(
              shift?.startTime,
              shift?.endTime,
            );

            const weeklyMinutes =
              assignmentImplication.implications.newWeeklyTime
                .newWeeklyWorkedMinutes;
            const weeklyDelta =
              assignmentImplication.implications.newWeeklyTime
                .newWeeklyTimeDeltaMinutes;
            const totalDuties =
              assignmentImplication.implications.newMonthlyDuties
                .newNumberMonthlyDuties;
            const dutiesDelta =
              assignmentImplication.implications.newMonthlyDuties
                .newMonthlyDutiesDelta;

            return (
              <ListItem
                key={assignmentImplication.assignmentId}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  mb: isLast ? 0 : 1,
                  bgcolor: "background.paper",
                }}
              >
                <ListItemText
                  slotProps={{
                    primary: { component: "div" },
                    secondary: { component: "div" },
                  }}
                  primary={
                    isMobile ? (
                      <Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2">{emoji}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {shift?.name || "—"}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="body2">{dateLabel}</Typography>
                          {timeRange && (
                            <>
                              <Typography variant="body2">⋅</Typography>
                              <Typography variant="caption">
                                {timeRange}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2">{emoji}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {shift?.name || "—"}
                        </Typography>
                        <Typography variant="body2">⋅</Typography>
                        <Typography variant="body2">{dateLabel}</Typography>
                        {timeRange && (
                          <>
                            <Typography variant="body2">⋅</Typography>
                            <Typography variant="caption">
                              {timeRange}
                            </Typography>
                          </>
                        )}
                      </Box>
                    )
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                      sx={{ mt: 0.25 }}
                    >
                      {formatWeeklyTime(weeklyMinutes, weeklyDelta)} |{" "}
                      {formatMonthlyDuties(totalDuties, dutiesDelta)} | {reason}
                    </Typography>
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
          {t("analysis_subtitle")}
        </Typography>
        <Button
          variant="contained"
          onClick={onViewDetails}
          sx={{ textTransform: "none" }}
          data-testid="view-analysis-details-button"
        >
          {t("btn_see_details")}
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
