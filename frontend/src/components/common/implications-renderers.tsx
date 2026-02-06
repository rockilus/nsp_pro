import React from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import {
  ReplacementImplicationsT,
  ConstraintHitsT,
} from "../../types/replacement";

export const renderBoolean = (value: boolean): React.JSX.Element => {
  return (
    <span style={{ color: value ? "green" : "red", fontWeight: "bold" }}>
      {value ? "✓" : "✗"}
    </span>
  );
};

export const renderWeeklyTime = (
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

export const renderMonthlyDuties = (
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

export const renderConstraintHit = (
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

export const renderOverlapHit = (
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

export const renderFilterHit = (
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

export const renderRequestHit = (
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
