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
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ReplacementCandidateT } from "../../types/replacement";

interface ReplacementDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  candidate: ReplacementCandidateT | null;
  lng: string;
}

export function ReplacementDetailsDialog({
  open,
  onClose,
  candidate,
  lng,
}: ReplacementDetailsDialogProps) {
  if (!candidate) return null;

  const implications = candidate.replacementImplications;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      data-testid="replacement-details-dialog"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Replacement Details: {candidate.workerName}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* Employment Status */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Employment Status
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Employed: {implications.isEmployed ? "Yes" : "No"}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Specialty */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Specialty Requirements
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Has Required Specialty: {implications.hasSpecialty ? "Yes" : "No"}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Leave Status */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Leave Status
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Not on Leave: {implications.isntOnLeave ? "Yes" : "No"}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Filter Violations */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Dimension Filters
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Passes Filters:{" "}
            {implications.filterHits.isntFilteredOut ? "Yes" : "No"}
            {!implications.filterHits.isntFilteredOut &&
              implications.filterHits.filterLabels.length > 0 && (
                <>
                  <br />
                  Violated Filters:{" "}
                  {implications.filterHits.filterLabels.join(", ")}
                </>
              )}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Overlaps */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Assignment Overlaps
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            No Overlaps: {implications.overlapHits.hasntOverlap ? "Yes" : "No"}
            {!implications.overlapHits.hasntOverlap && (
              <>
                <br />
                Overlapping Assignments:{" "}
                {implications.overlapHits.overlapAssignmentIds.length}
              </>
            )}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Hard Constraints */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Hard Constraints
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Meets Hard Constraints:{" "}
            {implications.hardConstraintHits.meetsConstraints ? "Yes" : "No"}
            {!implications.hardConstraintHits.meetsConstraints && (
              <>
                <br />
                Violations: {implications.hardConstraintHits.breaches.length}
              </>
            )}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Request Conflicts */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Request Conflicts
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            No Request Conflicts:{" "}
            {implications.requestHits.hasNoRequestConflict ? "Yes" : "No"}
            {!implications.requestHits.hasNoRequestConflict && (
              <>
                <br />
                Conflicting Requests:{" "}
                {implications.requestHits.conflictingRequestIds.length}
              </>
            )}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Soft Constraints */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Soft Constraints
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Meets Soft Constraints:{" "}
            {implications.softConstraintHits.meetsConstraints ? "Yes" : "No"}
            {!implications.softConstraintHits.meetsConstraints && (
              <>
                <br />
                Violations: {implications.softConstraintHits.breaches.length}
              </>
            )}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Monthly Duties */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Monthly Duties Impact
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            New Monthly Duties:{" "}
            {implications.newMonthlyDuties.newNumberMonthlyDuties}
            <br />
            Change:{" "}
            {implications.newMonthlyDuties.newMonthlyDutiesDelta > 0 ? "+" : ""}
            {implications.newMonthlyDuties.newMonthlyDutiesDelta}
            <br />
            Meets Target:{" "}
            {implications.newMonthlyDuties.meetsTarget ? "Yes" : "No"}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Weekly Work Time */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Weekly Work Time Impact
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            New Weekly Hours:{" "}
            {Math.round(implications.newWeeklyTime.newWeeklyWorkedMinutes / 60)}
            h
            <br />
            Change:{" "}
            {Math.round(
              implications.newWeeklyTime.newWeeklyTimeDeltaMinutes / 60,
            ) > 0
              ? "+"
              : ""}
            {Math.round(
              implications.newWeeklyTime.newWeeklyTimeDeltaMinutes / 60,
            )}
            h
            <br />
            Meets Target:{" "}
            {implications.newWeeklyTime.meetsTarget ? "Yes" : "No"}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Historical Indicators */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Historical Indicators (Last 12 Months)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Times Worked This Shift: {implications.nbTimesDidShiftLtm.count}
            {implications.nbTimesDidShiftLtm.lastDate && (
              <>
                <br />
                Last Time:{" "}
                {implications.nbTimesDidShiftLtm.lastDate.format("YYYY-MM-DD")}
              </>
            )}
            <br />
            Times Worked This Weekday:{" "}
            {implications.nbTimesWorkedWeekdayLtm.count}
            {implications.nbTimesWorkedWeekdayLtm.lastDate && (
              <>
                <br />
                Last Time:{" "}
                {implications.nbTimesWorkedWeekdayLtm.lastDate.format(
                  "YYYY-MM-DD",
                )}
              </>
            )}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
