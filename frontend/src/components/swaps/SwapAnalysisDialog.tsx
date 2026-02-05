"use client";

import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Fragment } from "react";
import { useState } from "react";
import dayjs from "dayjs";
import {
  SwapValidationResultT,
  SwapAssignmentInfoT,
} from "../../types/swapValidation";
import { ReplacementImplicationsT } from "../../types/replacement";
import { AssignmentDataDictT } from "../../types/assignment";

interface SwapAnalysisDialogProps {
  open: boolean;
  onClose: () => void;
  validationResult: SwapValidationResultT;
  assignments: AssignmentDataDictT[];
}

export default function SwapAnalysisDialog({
  open,
  onClose,
  validationResult,
  assignments,
}: SwapAnalysisDialogProps) {
  const [activeTab, setActiveTab] = useState(0);

  const workerAInfo = validationResult.workerAInfo;
  const workerBInfo = validationResult.workerBInfo;

  const getAssignmentData = (assignmentId: string) => {
    return assignments.find((a) => a.assignment.id === assignmentId);
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
    implications: ReplacementImplicationsT,
    type: "soft" | "hard",
  ): React.JSX.Element => {
    const hit =
      type === "soft"
        ? implications.softConstraintHits
        : implications.hardConstraintHits;

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

  const renderWorkerTable = (workerInfo: SwapAssignmentInfoT) => {
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", minWidth: 150 }}>
                Assignment
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", minWidth: 100 }}>
                State
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>H/week</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Duties/mo</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Soft</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Hard</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Request</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Overlap</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Filter</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Leave</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Specialty</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Employed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workerInfo.postSwap.map((postSwapItem, index) => {
              const preSwapItem = workerInfo.preSwap[index];
              const assignmentData = getAssignmentData(
                postSwapItem.assignmentId,
              );
              const currentImpl = preSwapItem.implications;
              const swappedImpl = postSwapItem.implications;

              const assignmentLabel = assignmentData
                ? `${assignmentData.shift.name} - ${dayjs(assignmentData.assignment.date).format("MMM D")}`
                : postSwapItem.assignmentId;

              return (
                <Fragment key={postSwapItem.assignmentId}>
                  {/* Pre-swap row */}
                  <TableRow key={`${postSwapItem.assignmentId}-pre`}>
                    <TableCell rowSpan={2}>{assignmentLabel}</TableCell>
                    <TableCell>Pre-swap</TableCell>
                    <TableCell>{renderWeeklyTime(currentImpl)}</TableCell>
                    <TableCell>{renderMonthlyDuties(currentImpl)}</TableCell>
                    <TableCell>
                      {renderConstraintHit(currentImpl, "soft")}
                    </TableCell>
                    <TableCell>
                      {renderConstraintHit(currentImpl, "hard")}
                    </TableCell>
                    <TableCell>{renderRequestHit(currentImpl)}</TableCell>
                    <TableCell>{renderOverlapHit(currentImpl)}</TableCell>
                    <TableCell>{renderFilterHit(currentImpl)}</TableCell>
                    <TableCell>
                      {renderBoolean(currentImpl.isntOnLeave)}
                    </TableCell>
                    <TableCell>
                      {renderBoolean(currentImpl.hasSpecialty)}
                    </TableCell>
                    <TableCell>
                      {renderBoolean(currentImpl.isEmployed)}
                    </TableCell>
                  </TableRow>

                  {/* Post-swap row */}
                  <TableRow
                    key={`${postSwapItem.assignmentId}-post`}
                    sx={{ bgcolor: "action.hover" }}
                  >
                    <TableCell sx={{ fontWeight: "bold" }}>Post-swap</TableCell>
                    <TableCell>{renderWeeklyTime(swappedImpl)}</TableCell>
                    <TableCell>{renderMonthlyDuties(swappedImpl)}</TableCell>
                    <TableCell>
                      {renderConstraintHit(swappedImpl, "soft")}
                    </TableCell>
                    <TableCell>
                      {renderConstraintHit(swappedImpl, "hard")}
                    </TableCell>
                    <TableCell>{renderRequestHit(swappedImpl)}</TableCell>
                    <TableCell>{renderOverlapHit(swappedImpl)}</TableCell>
                    <TableCell>{renderFilterHit(swappedImpl)}</TableCell>
                    <TableCell>
                      {renderBoolean(swappedImpl.isntOnLeave)}
                    </TableCell>
                    <TableCell>
                      {renderBoolean(swappedImpl.hasSpecialty)}
                    </TableCell>
                    <TableCell>
                      {renderBoolean(swappedImpl.isEmployed)}
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
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
          Swap Analysis Details
        </Box>
        <Typography variant="body2" color="text.secondary">
          {validationResult.validationMessage}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ paddingBottom: "24px" }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab
            label={`Worker A: ${workerAInfo.workerName}`}
            data-testid="worker-a-tab"
          />
          <Tab
            label={`Worker B: ${workerBInfo.workerName}`}
            data-testid="worker-b-tab"
          />
        </Tabs>

        {activeTab === 0 && renderWorkerTable(workerAInfo)}
        {activeTab === 1 && renderWorkerTable(workerBInfo)}

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Pre-swap shows the current state with existing assignments.
            Post-swap shows the projected state after completing the swap. Green
            ✓ indicates pass, red ✗ indicates violation.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
