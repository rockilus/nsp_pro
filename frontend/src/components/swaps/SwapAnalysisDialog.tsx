"use client";

import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import dayjs from "dayjs";
import {
  SwapValidationResultT,
  SwapAssignmentInfoT,
  AssignmentImplicationT,
} from "../../types/swapValidation";
import { AssignmentDataDictT } from "../../types/assignment";
import { useTranslation } from "../../app/i18n/client";
import { buildSwapValidationMessage } from "./swapValidationMessages";
import {
  renderBoolean,
  renderWeeklyTime,
  renderMonthlyDuties,
  renderConstraintHit,
  renderOverlapHit,
  renderFilterHit,
  renderRequestHit,
} from "../common/implications-renderers";

interface SwapAnalysisDialogProps {
  open: boolean;
  onClose: () => void;
  validationResult: SwapValidationResultT;
  assignments: AssignmentDataDictT[];
  lng: string;
}

export default function SwapAnalysisDialog({
  open,
  onClose,
  validationResult,
  assignments,
  lng,
}: SwapAnalysisDialogProps) {
  const { t } = useTranslation(lng, "swap-page");

  // Rotated column dimensions
  const ROTATED_COLUMN_WIDTH = 40;
  const ASSIGNMENT_COLUMN_WIDTH = 220;
  const totalColumns = 13; // 1 Assignment + 12 implication columns

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

  const formatAssignmentLabel = (
    assignmentData: AssignmentDataDictT | undefined,
  ): string => {
    if (!assignmentData) return "Unknown Assignment";

    const { shift, assignment } = assignmentData;
    const dateStr = dayjs(assignment.date).format("MMM D");
    const startStr = shift.startTime.format("HH:mm");
    const endStr = shift.endTime.format("HH:mm");
    const endsNextDay =
      shift.endTime.isBefore(shift.startTime) ||
      shift.endTime.diff(shift.startTime, "day") > 0;

    return `${shift.name} - ${dateStr} - ${startStr}–${endStr}${endsNextDay ? "⁺¹" : ""}`;
  };

  const renderAssignmentRow = (item: AssignmentImplicationT) => {
    const assignmentData = getAssignmentData(item.assignmentId);
    const impl = item.implications;

    return (
      <TableRow
        key={item.assignmentId}
        data-testid={`assignment-row-${item.assignmentId}`}
        sx={{
          "&:hover": { backgroundColor: "action.hover" },
        }}
      >
        <TableCell
          sx={{
            position: "sticky",
            left: 0,
            backgroundColor: "background.paper",
            zIndex: 1,
            minWidth: ASSIGNMENT_COLUMN_WIDTH,
            padding: "8px 16px",
          }}
        >
          <Typography variant="body2" fontWeight="medium">
            {formatAssignmentLabel(assignmentData)}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderWeeklyTime(impl)}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderMonthlyDuties(impl)}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          <Typography variant="body2">
            {impl.nbTimesDidShiftLtm.count}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          <Typography variant="body2">
            {impl.nbTimesWorkedWeekdayLtm.count}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderConstraintHit(impl.softConstraintHits, "soft")}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderConstraintHit(impl.hardConstraintHits, "hard")}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderRequestHit(impl)}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderOverlapHit(impl)}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderFilterHit(impl)}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderBoolean(impl.isntOnLeave)}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderBoolean(impl.hasSpecialty)}
        </TableCell>
        <TableCell
          sx={{
            padding: 0,
            textAlign: "center",
            minWidth: ROTATED_COLUMN_WIDTH,
          }}
        >
          {renderBoolean(impl.isEmployed)}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      data-testid="swap-analysis-dialog"
    >
      <DialogTitle>
        <Box sx={{ fontWeight: 500, fontSize: "1.25rem" }}>
          Swap Analysis: {workerAInfo.workerName} ↔ {workerBInfo.workerName}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {validationMessage}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ paddingBottom: "24px" }}>
        <TableContainer
          component={Paper}
          sx={{ maxHeight: 700, overflowX: "auto" }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ASSIGNMENT_COLUMN_WIDTH,
                    position: "sticky",
                    left: 0,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                    padding: 0,
                    verticalAlign: "bottom",
                  }}
                >
                  Assignment
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
              </TableRow>
            </TableHead>
            <TableBody>
              {/* POST-SWAP SECTION */}
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  sx={{
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    padding: "12px 16px",
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="section-postswap"
                >
                  Post-swap
                </TableCell>
              </TableRow>

              {/* Worker A Post-swap Subsection */}
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  sx={{
                    backgroundColor: "action.hover",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                    padding: "8px 16px",
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="subsection-worker-a-postswap"
                >
                  Worker A: {workerAInfo.workerName}
                </TableCell>
              </TableRow>
              {workerAInfo.postSwap.length > 0 ? (
                workerAInfo.postSwap.map((item) => renderAssignmentRow(item))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={totalColumns}
                    sx={{ textAlign: "center", padding: "16px" }}
                  >
                    No assignments
                  </TableCell>
                </TableRow>
              )}

              {/* Worker B Post-swap Subsection */}
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  sx={{
                    backgroundColor: "action.hover",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                    padding: "8px 16px",
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="subsection-worker-b-postswap"
                >
                  Worker B: {workerBInfo.workerName}
                </TableCell>
              </TableRow>
              {workerBInfo.postSwap.length > 0 ? (
                workerBInfo.postSwap.map((item) => renderAssignmentRow(item))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={totalColumns}
                    sx={{ textAlign: "center", padding: "16px" }}
                  >
                    No assignments
                  </TableCell>
                </TableRow>
              )}

              {/* Blank Separator Row */}
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  sx={{
                    height: 24,
                    borderBottom: 0,
                    backgroundColor: "background.default",
                  }}
                />
              </TableRow>

              {/* PRE-SWAP SECTION */}
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  sx={{
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    padding: "12px 16px",
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="section-preswap"
                >
                  Pre-swap
                </TableCell>
              </TableRow>

              {/* Worker A Pre-swap Subsection */}
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  sx={{
                    backgroundColor: "action.hover",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                    padding: "8px 16px",
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="subsection-worker-a-preswap"
                >
                  Worker A: {workerAInfo.workerName}
                </TableCell>
              </TableRow>
              {workerAInfo.preSwap.length > 0 ? (
                workerAInfo.preSwap.map((item) => renderAssignmentRow(item))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={totalColumns}
                    sx={{ textAlign: "center", padding: "16px" }}
                  >
                    No assignments
                  </TableCell>
                </TableRow>
              )}

              {/* Worker B Pre-swap Subsection */}
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  sx={{
                    backgroundColor: "action.hover",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                    padding: "8px 16px",
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="subsection-worker-b-preswap"
                >
                  Worker B: {workerBInfo.workerName}
                </TableCell>
              </TableRow>
              {workerBInfo.preSwap.length > 0 ? (
                workerBInfo.preSwap.map((item) => renderAssignmentRow(item))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={totalColumns}
                    sx={{ textAlign: "center", padding: "16px" }}
                  >
                    No assignments
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Post-swap shows the projected state after completing the swap.
            Pre-swap shows the current state with existing assignments. Green ✓
            indicates pass, red ✗ indicates violation.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
