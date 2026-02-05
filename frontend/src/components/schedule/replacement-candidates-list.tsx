import React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useTranslation } from "../../app/i18n/client";
import {
  ReplacementCandidateT,
  MostConstrainingReasonT,
} from "../../types/replacement";

interface ReplacementCandidatesListProps {
  lng: string;
  candidates: ReplacementCandidateT[] | null;
  selectedCandidateId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  onViewDetails: (candidate: ReplacementCandidateT) => void;
  onConfirmReplacement: () => void;
  onCheckReplacement: () => void;
  isSubmitting: boolean;
  isCheckingReplacement: boolean;
}

export function ReplacementCandidatesList({
  lng,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  onViewDetails,
  onConfirmReplacement,
  onCheckReplacement,
  isSubmitting,
  isCheckingReplacement,
}: ReplacementCandidatesListProps) {
  const { t } = useTranslation(lng, "schedule-page");

  const getCategoryColor = (
    category: "can_do" | "could_do" | "cant_do",
  ): "success" | "warning" | "error" => {
    switch (category) {
      case "can_do":
        return "success";
      case "could_do":
        return "warning";
      case "cant_do":
        return "error";
    }
  };

  const getReasonLabel = (reason: MostConstrainingReasonT): string => {
    // Map enum values to translation keys
    const reasonMap: Record<MostConstrainingReasonT, string> = {
      [MostConstrainingReasonT.NOT_EMPLOYED]: t(
        "replacement_reason_not_employed",
      ),
      [MostConstrainingReasonT.MISSING_SPECIALTY]: t(
        "replacement_reason_missing_specialty",
      ),
      [MostConstrainingReasonT.ON_LEAVE]: t("replacement_reason_on_leave"),
      [MostConstrainingReasonT.FILTERED_OUT]: t(
        "replacement_reason_filtered_out",
      ),
      [MostConstrainingReasonT.HAS_OVERLAP]: t(
        "replacement_reason_has_overlap",
      ),
      [MostConstrainingReasonT.HARD_CONSTRAINT_VIOLATION]: t(
        "replacement_reason_hard_constraint_violation",
      ),
      [MostConstrainingReasonT.REQUEST_CONFLICT]: t(
        "replacement_reason_request_conflict",
      ),
      [MostConstrainingReasonT.SOFT_CONSTRAINT_VIOLATION]: t(
        "replacement_reason_soft_constraint_violation",
      ),
      [MostConstrainingReasonT.NO_CONSTRAINTS_VIOLATED]: t(
        "replacement_reason_no_constraints_violated",
      ),
    };

    return reasonMap[reason] || reason;
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Button
        variant="outlined"
        color="info"
        onClick={onCheckReplacement}
        disabled={isCheckingReplacement}
        fullWidth
        data-testid="check-replacement-button"
        sx={{ mb: 2 }}
      >
        {isCheckingReplacement ? (
          <>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            {t("checking")}
          </>
        ) : (
          t("check_replacement")
        )}
      </Button>

      {candidates && candidates.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            {t("replacement_candidates")} ({candidates.length})
          </Typography>
          <List sx={{ maxHeight: 400, overflow: "auto", p: 0 }}>
            {candidates.map((candidate) => (
              <ListItem
                key={candidate.workerId}
                disablePadding
                sx={{
                  mb: 1,
                  border: 1,
                  borderColor:
                    selectedCandidateId === candidate.workerId
                      ? "primary.main"
                      : "divider",
                  borderRadius: 1,
                  backgroundColor:
                    selectedCandidateId === candidate.workerId
                      ? "action.selected"
                      : "background.paper",
                }}
              >
                <ListItemButton
                  onClick={() => onSelectCandidate(candidate.workerId)}
                  data-testid={`candidate-${candidate.workerId}`}
                >
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                        flexWrap="wrap"
                      >
                        <Chip
                          size="small"
                          label="●"
                          color={getCategoryColor(
                            candidate.replacementCategory,
                          )}
                          sx={{ minWidth: 24, "& .MuiChip-label": { px: 0.5 } }}
                        />
                        <Typography variant="body2" fontWeight="medium">
                          {candidate.workerName}
                        </Typography>
                        {candidate.rank === 0 && (
                          <Chip
                            label={t("current")}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: "auto" }}
                        >
                          {t("rank")}: {candidate.rank}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" display="block">
                          {getReasonLabel(candidate.mostConstrainingReason)}
                        </Typography>
                        <Box display="flex" gap={2} mt={0.5} flexWrap="wrap">
                          <Typography variant="caption" color="text.secondary">
                            {t("weekly_hours")}:{" "}
                            {Math.round(
                              candidate.replacementImplications.newWeeklyTime
                                .newWeeklyWorkedMinutes / 60,
                            )}
                            h
                            {candidate.replacementImplications.newWeeklyTime
                              .newWeeklyTimeDeltaMinutes !== 0 && (
                              <span
                                style={{
                                  color:
                                    candidate.replacementImplications
                                      .newWeeklyTime.newWeeklyTimeDeltaMinutes >
                                    0
                                      ? "green"
                                      : "red",
                                }}
                              >
                                {" "}
                                (
                                {candidate.replacementImplications.newWeeklyTime
                                  .newWeeklyTimeDeltaMinutes > 0
                                  ? "+"
                                  : ""}
                                {Math.round(
                                  candidate.replacementImplications
                                    .newWeeklyTime.newWeeklyTimeDeltaMinutes /
                                    60,
                                )}
                                h)
                              </span>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t("monthly_duties")}:{" "}
                            {
                              candidate.replacementImplications.newMonthlyDuties
                                .newNumberMonthlyDuties
                            }
                            {candidate.replacementImplications.newMonthlyDuties
                              .newMonthlyDutiesDelta !== 0 && (
                              <span
                                style={{
                                  color:
                                    candidate.replacementImplications
                                      .newMonthlyDuties.newMonthlyDutiesDelta >
                                    0
                                      ? "green"
                                      : "red",
                                }}
                              >
                                {" "}
                                (
                                {candidate.replacementImplications
                                  .newMonthlyDuties.newMonthlyDutiesDelta > 0
                                  ? "+"
                                  : ""}
                                {
                                  candidate.replacementImplications
                                    .newMonthlyDuties.newMonthlyDutiesDelta
                                }
                                )
                              </span>
                            )}
                          </Typography>
                        </Box>
                        <Box display="flex" gap={1} mt={1}>
                          <Button
                            size="small"
                            variant="text"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails(candidate);
                            }}
                          >
                            {t("see_details")}
                          </Button>
                        </Box>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {selectedCandidateId && (
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={onConfirmReplacement}
                disabled={isSubmitting}
                data-testid="select-replacement-button"
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    {t("selecting")}
                  </>
                ) : (
                  t("select_as_replacement")
                )}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
