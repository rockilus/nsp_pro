import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  ReplacementCandidateT,
  ConstraintHitsT,
  ReplacementImplicationsT,
} from "../../types/replacement";

interface ReplacementDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  candidates: ReplacementCandidateT[];
  onReplace: (candidateId: string) => void;
  isSubmitting: boolean;
  lng: string;
}

export function ReplacementDetailsDialog({
  open,
  onClose,
  candidates,
  onReplace,
  isSubmitting,
  lng,
}: ReplacementDetailsDialogProps) {
  // Rotated column dimensions
  const ROTATED_COLUMN_WIDTH = 40;

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

  const renderBoolean = (value: boolean): React.JSX.Element => {
    return (
      <span style={{ color: value ? "green" : "red", fontWeight: "bold" }}>
        {value ? "✓" : "✗"}
      </span>
    );
  };

  const renderWeeklyTime = (
    implications: ReplacementImplicationsT,
  ): React.JSX.Element => {
    const hours = Math.round(
      implications.newWeeklyTime.newWeeklyWorkedMinutes / 60,
    );
    const delta = Math.round(
      implications.newWeeklyTime.newWeeklyTimeDeltaMinutes / 60,
    );

    return (
      <Box>
        <Typography variant="body2">{hours}h</Typography>
        {delta !== 0 && (
          <Typography
            variant="caption"
            sx={{
              color: delta > 0 ? "success.main" : "error.main",
            }}
          >
            ({delta > 0 ? "+" : ""}
            {delta}h)
          </Typography>
        )}
      </Box>
    );
  };

  const renderMonthlyDuties = (
    implications: ReplacementImplicationsT,
  ): React.JSX.Element => {
    const count = implications.newMonthlyDuties.newNumberMonthlyDuties;
    const delta = implications.newMonthlyDuties.newMonthlyDutiesDelta;

    return (
      <Box>
        <Typography variant="body2">{count}</Typography>
        {delta !== 0 && (
          <Typography
            variant="caption"
            sx={{
              color: delta > 0 ? "success.main" : "error.main",
            }}
          >
            ({delta > 0 ? "+" : ""}
            {delta})
          </Typography>
        )}
      </Box>
    );
  };

  const renderConstraintHit = (
    hit: ConstraintHitsT,
    type: string,
  ): React.JSX.Element => {
    if (hit.meetsConstraints) {
      return renderBoolean(true);
    }

    const tooltipText =
      hit.breaches.length > 0
        ? `${hit.breaches.length} violation(s): ${hit.breaches.map((b) => b.description).join(", ")}`
        : "Constraint violated";

    return (
      <Tooltip title={tooltipText} arrow>
        <span>{renderBoolean(false)}</span>
      </Tooltip>
    );
  };

  const renderOverlapHit = (
    implications: ReplacementImplicationsT,
  ): React.JSX.Element => {
    const hasNoOverlap = implications.overlapHits.hasntOverlap;

    if (hasNoOverlap) {
      return renderBoolean(true);
    }

    const tooltipText = `${implications.overlapHits.overlapAssignmentIds.length} overlapping assignment(s)`;

    return (
      <Tooltip title={tooltipText} arrow>
        <span>{renderBoolean(false)}</span>
      </Tooltip>
    );
  };

  const renderFilterHit = (
    implications: ReplacementImplicationsT,
  ): React.JSX.Element => {
    const passesFilters = implications.filterHits.isntFilteredOut;

    if (passesFilters) {
      return renderBoolean(true);
    }

    const tooltipText =
      implications.filterHits.filterLabels.length > 0
        ? `Violated filters: ${implications.filterHits.filterLabels.join(", ")}`
        : "Filtered out";

    return (
      <Tooltip title={tooltipText} arrow>
        <span>{renderBoolean(false)}</span>
      </Tooltip>
    );
  };

  const renderRequestHit = (
    implications: ReplacementImplicationsT,
  ): React.JSX.Element => {
    const noConflict = implications.requestHits.hasNoRequestConflict;

    if (noConflict) {
      return renderBoolean(true);
    }

    const tooltipText = `${implications.requestHits.conflictingRequestIds.length} conflicting request(s)`;

    return (
      <Tooltip title={tooltipText} arrow>
        <span>{renderBoolean(false)}</span>
      </Tooltip>
    );
  };

  // Sort candidates by rank (current worker with rank=0 first)
  const sortedCandidates = [...candidates].sort((a, b) => a.rank - b.rank);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      data-testid="replacement-details-dialog"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Replacement Candidates Comparison ({candidates.length})
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <TableContainer sx={{ maxHeight: 600, overflowX: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 60,
                    position: "sticky",
                    left: 0,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                    padding: 0,
                    textAlign: "center",
                  }}
                ></TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 180,
                    position: "sticky",
                    left: 60,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                    padding: 0,
                    verticalAlign: "bottom",
                  }}
                >
                  Candidate
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 50,
                    // position: "sticky",
                    left: 240,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                    padding: 0,
                    textAlign: "center",
                  }}
                >
                  {/* Category emoji - no title */}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  H/week
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Duties/month
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Shift LTM
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Day LTM
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Soft
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Hard
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Request
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Overlap
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Filter
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Leave
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Specialty
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROTATED_COLUMN_WIDTH,
                    padding: 0,
                    paddingBottom: "4px",
                    writingMode: "sideways-lr",
                  }}
                >
                  Employed
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 120,
                    padding: 0,
                    textAlign: "center",
                    verticalAlign: "bottom",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedCandidates.map((candidate) => {
                const isCurrentWorker = candidate.rank === 0;
                const impl = candidate.replacementImplications;

                return (
                  <TableRow
                    key={candidate.workerId}
                    sx={{
                      borderBottom: isCurrentWorker ? "3px solid" : undefined,
                      borderBottomColor: isCurrentWorker
                        ? "primary.main"
                        : undefined,
                      backgroundColor: isCurrentWorker
                        ? "action.hover"
                        : undefined,
                    }}
                    data-testid={`candidate-row-${candidate.workerId}`}
                  >
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        backgroundColor: isCurrentWorker
                          ? "action.hover"
                          : "background.paper",
                        zIndex: 1,
                        padding: 0,
                        textAlign: "center",
                      }}
                    >
                      {isCurrentWorker ? "" : candidate.rank}
                    </TableCell>
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 60,
                        backgroundColor: isCurrentWorker
                          ? "action.hover"
                          : "background.paper",
                        zIndex: 1,
                        padding: 0,
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {candidate.workerName}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        // position: "sticky",
                        left: 240,
                        backgroundColor: isCurrentWorker
                          ? "action.hover"
                          : "background.paper",
                        zIndex: 1,
                        textAlign: "center",
                        padding: 0,
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>
                        {getCategoryEmoji(candidate.replacementCategory)}
                      </span>
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderWeeklyTime(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderMonthlyDuties(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      <Typography variant="body2">
                        {impl.nbTimesDidShiftLtm.count}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      <Typography variant="body2">
                        {impl.nbTimesWorkedWeekdayLtm.count}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderConstraintHit(impl.softConstraintHits, "soft")}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderConstraintHit(impl.hardConstraintHits, "hard")}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderRequestHit(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderOverlapHit(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderFilterHit(impl)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderBoolean(impl.isntOnLeave)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderBoolean(impl.hasSpecialty)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {renderBoolean(impl.isEmployed)}
                    </TableCell>
                    <TableCell sx={{ padding: 0, textAlign: "center" }}>
                      {!isCurrentWorker && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => onReplace(candidate.workerId)}
                          disabled={isSubmitting}
                          data-testid={`replace-candidate-${candidate.workerId}`}
                        >
                          {isSubmitting ? (
                            <>
                              <CircularProgress size={12} sx={{ mr: 0.5 }} />
                              Replacing...
                            </>
                          ) : (
                            "Replace"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
