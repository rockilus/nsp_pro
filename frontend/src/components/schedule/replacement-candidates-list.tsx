import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
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
  onCancel: () => void;
  isOpen: boolean;
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
  onCancel,
  isOpen,
  isSubmitting,
  isCheckingReplacement,
}: ReplacementCandidatesListProps) {
  const { t } = useTranslation(lng, "schedule-page");

  const getCategoryEmoji = (
    category: "can_do" | "could_do" | "cant_do",
  ): string => {
    switch (category) {
      case "can_do":
        return "🟢";
      case "could_do":
        return "🟠";
      case "cant_do":
        return "🔴";
      default:
        return "⚪";
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
    <Box>
      {!isOpen && (
        <Button
          variant="contained"
          color="info"
          onClick={onCheckReplacement}
          disabled={isCheckingReplacement}
          // fullWidth
          data-testid="check-replacement-button"
          sx={{ mt: "16px", mb: "16px", textTransform: "none" }}
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
      )}

      {isOpen && candidates && candidates.length > 0 && (
        <>
          <Divider sx={{ mb: "8px", mt: "16px" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
            {t("replacement_candidates")}{" "}
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              // Open dialog with all candidates for comparison
              if (candidates.length > 0) onViewDetails(candidates[0]);
            }}
            sx={{ textTransform: "none", mb: 1, ml: "auto" }}
          >
            {t("see_details")}
          </Button>
          <List sx={{ maxHeight: 400, overflow: "auto", p: 0 }}>
            {candidates
              .filter((candidate) => candidate.rank !== 0)
              .map((candidate) => (
                <ListItem
                  key={candidate.workerId}
                  disablePadding
                  sx={{
                    mb: 0.5,
                    backgroundColor:
                      selectedCandidateId === candidate.workerId
                        ? "action.selected"
                        : "transparent",
                    borderLeft: 3,
                    borderColor:
                      selectedCandidateId === candidate.workerId
                        ? "primary.main"
                        : "transparent",
                  }}
                >
                  <ListItemButton
                    onClick={() => onSelectCandidate(candidate.workerId)}
                    data-testid={`candidate-${candidate.workerId}`}
                    sx={{ py: 0.75 }}
                  >
                    <ListItemText
                      primary={
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          gap={1}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              component="span"
                              sx={{
                                display: "inline-block",
                                fontSize: "1.1rem",
                              }}
                            >
                              {getCategoryEmoji(candidate.replacementCategory)}
                            </Box>
                            <Typography variant="body2" fontWeight="medium">
                              {candidate.workerName}
                            </Typography>
                          </Box>
                          {selectedCandidateId === candidate.workerId && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirmReplacement();
                              }}
                              disabled={isSubmitting}
                              data-testid="select-replacement-button"
                              sx={{ ml: "auto", textTransform: "none" }}
                            >
                              {isSubmitting ? (
                                <>
                                  <CircularProgress
                                    size={12}
                                    sx={{ mr: 0.5 }}
                                  />
                                  {t("selecting")}
                                </>
                              ) : (
                                t("replace")
                              )}
                            </Button>
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          sx={{ mt: 0.25 }}
                        >
                          {Math.round(
                            candidate.replacementImplications.newWeeklyTime
                              .newWeeklyWorkedMinutes / 60,
                          )}
                          h/week
                          {candidate.replacementImplications.newWeeklyTime
                            .newWeeklyTimeDeltaMinutes !== 0 && (
                            <span
                              style={{
                                color:
                                  candidate.replacementImplications
                                    .newWeeklyTime.newWeeklyTimeDeltaMinutes > 0
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
                                candidate.replacementImplications.newWeeklyTime
                                  .newWeeklyTimeDeltaMinutes / 60,
                              )}
                              h)
                            </span>
                          )}{" "}
                          |{" "}
                          {
                            candidate.replacementImplications.newMonthlyDuties
                              .newNumberMonthlyDuties
                          }{" "}
                          duties/month
                          {candidate.replacementImplications.newMonthlyDuties
                            .newMonthlyDutiesDelta !== 0 && (
                            <span
                              style={{
                                color:
                                  candidate.replacementImplications
                                    .newMonthlyDuties.newMonthlyDutiesDelta > 0
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
                          )}{" "}
                          | {getReasonLabel(candidate.mostConstrainingReason)}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
          </List>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onCancel}
              data-testid="cancel-replacement-button"
              sx={{ textTransform: "none" }}
            >
              {t("cancel")}
            </Button>
          </Box>
          <Divider sx={{ mt: "8px", mb: "12px" }} />{" "}
        </>
      )}
    </Box>
  );
}
