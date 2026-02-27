"use client";

import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import {
  SwapValidationResultT,
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
import { getCategoryEmoji } from "../../utils/replacementHelpers";

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
  const totalColumns = 14; // 1 Assignment + 1 Category + 12 implication columns

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
            // position: "sticky",
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
            textAlign: "center",
            padding: 0,
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>
            {getCategoryEmoji(item.replacementCategory)}
          </span>
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
      fullScreen
      data-testid="swap-analysis-dialog"
    >
      <DialogTitle sx={{ position: "relative" }}>
        <Box sx={{ fontWeight: 500, fontSize: "1.25rem" }}>
          {t("analysis_title", {
            workerA: workerAInfo.workerName,
            workerB: workerBInfo.workerName,
          })}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {validationMessage}
        </Typography>
        <IconButton
          aria-label={t("btn_close")}
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
          size="large"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ paddingBottom: "24px" }}>
        <TableContainer
          component={Paper}
          // sx={{ maxHeight: 700, overflowX: "auto" }}
        >
          <Table
            // stickyHeader
            size="small"
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: ASSIGNMENT_COLUMN_WIDTH,
                    // position: "sticky",
                    left: 0,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                    padding: 0,
                    verticalAlign: "bottom",
                    paddingLeft: "16px",
                  }}
                >
                  {t("col_assignment")}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    minWidth: 50,
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
                  {t("col_h_week")}
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
                  {t("col_duties_month")}
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
                  {t("col_shift_ltm")}
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
                  {t("col_day_ltm")}
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
                  {t("col_soft")}
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
                  {t("col_hard")}
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
                  {t("col_request")}
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
                  {t("col_overlap")}
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
                  {t("col_filter")}
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
                  {t("col_leave")}
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
                  {t("col_specialty")}
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
                  {t("col_employed")}
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
                    // position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="section-postswap"
                >
                  {t("analysis_post_swap")}
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
                    // position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="subsection-worker-a-postswap"
                >
                  {workerAInfo.workerName}
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
                    {t("analysis_no_assignments")}
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
                    // position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="subsection-worker-b-postswap"
                >
                  {workerBInfo.workerName}
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
                    {t("analysis_no_assignments")}
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
                    // position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="section-preswap"
                >
                  {t("analysis_pre_swap")}
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
                    // position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="subsection-worker-a-preswap"
                >
                  {workerAInfo.workerName}
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
                    {t("analysis_no_assignments")}
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
                    // position: "sticky",
                    left: 0,
                    zIndex: 2,
                  }}
                  data-testid="subsection-worker-b-preswap"
                >
                  {workerBInfo.workerName}
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
                    {t("analysis_no_assignments")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t("analysis_footer")}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
