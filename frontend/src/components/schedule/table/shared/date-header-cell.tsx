import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "../../../../app/i18n/client";
// Components
import { RoleBased } from "../../../access/role-based";
// lucide-react
import { Sparkle } from "lucide-react";
// Styles
import "./date-header-cell.css";
// Types
import { ScheduleStatus, periodDateT } from "../../../../types/schedule";
import { TeamMembershipRole, TeamWithMembership } from "@/types/team";
import {
  ScheduleSelectionState,
  SelectionScope,
} from "../../../../types/scheduleSelection";
import { AssignmentT } from "@/types/assignment";

dayjs.extend(utc);
type ScheduleStatusLogoProps = {
  scheduleStatus: ScheduleStatus | null;
  lng: string;
};

const ScheduleStatusLogo: React.FC<ScheduleStatusLogoProps> = ({
  scheduleStatus,
  lng,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  if (scheduleStatus === null) return null;

  const containerClass =
    scheduleStatus === ScheduleStatus.VALIDATED
      ? "validated"
      : scheduleStatus === ScheduleStatus.CAMPAIGN
        ? "campaign"
        : "";

  const isPublished = scheduleStatus === ScheduleStatus.VALIDATED;

  const content = isPublished
    ? t("schedule_status_published_short") || "p"
    : scheduleStatus === ScheduleStatus.CAMPAIGN
      ? t("schedule_status_campaign_short") || "c"
      : "";

  const tooltipTitle = isPublished
    ? t("schedule_status_published_tooltip") || "Published"
    : scheduleStatus === ScheduleStatus.CAMPAIGN
      ? t("schedule_status_campaign_tooltip") || "Campaign"
      : "";

  return (
    <Tooltip title={tooltipTitle}>
      <div
        className={`schedule-status-logo-container ${containerClass}`}
        data-testid={`schedule-status-${scheduleStatus}`}
      >
        <div className="schedule-status-logo">{content}</div>
      </div>
    </Tooltip>
  );
};

export default function DateHeaderCell({
  periodDate,
  teamWithMembership,
  lng,
  isSelectionActive,
  selectionState,
  rowIds,
  selectionScope,
  onColumnSelect,
  assignments,
  isCustomSolveModeActive = false,
  onCustomColumnSelect,
}: {
  periodDate: periodDateT;
  teamWithMembership: TeamWithMembership;
  lng: string;
  isSelectionActive?: boolean;
  selectionState?: ScheduleSelectionState;
  rowIds?: string[];
  selectionScope?: SelectionScope;
  onColumnSelect?: (
    date: string,
    rowIds: string[],
    scope: SelectionScope,
  ) => void;
  assignments?: AssignmentT[];
  isCustomSolveModeActive?: boolean;
  onCustomColumnSelect?: (date: string, rowIds: string[]) => void;
}) {
  const today = dayjs.utc().startOf("day");
  const isToday = periodDate.date.isSame(today, "day");
  const dateStr = periodDate.date.format("YYYY-MM-DD");

  const isColumnSelected =
    !!isSelectionActive &&
    !!rowIds?.length &&
    rowIds.every((rowId) =>
      selectionState?.selectedCells.some(
        (c) => c.rowId === rowId && c.date === dateStr,
      ),
    );

  const rowIdSet = new Set(rowIds ?? []);
  const columnAssignmentIds = (assignments ?? [])
    .filter(
      (a) =>
        (rowIdSet.has(a.workerId) || rowIdSet.has(a.shiftId)) &&
        a.date.format("YYYY-MM-DD") === dateStr,
    )
    .map((a) => a.id);

  const isColumnIndeterminate =
    !!isSelectionActive &&
    !isColumnSelected &&
    (!!rowIds?.some((rowId) =>
      selectionState?.selectedCells.some(
        (c) => c.rowId === rowId && c.date === dateStr,
      ),
    ) ||
      columnAssignmentIds.some((id) =>
        selectionState?.selectedAssignmentIds.includes(id),
      ));

  return (
    <TableCell
      sx={{
        padding: 0,
      }}
      data-testid={`date-header-cell-${periodDate.date.format("YYYY-MM-DD")}`}
    >
      <div className="date-header-container">
        <span className={`weekday ${isToday && "today"}`}>
          {periodDate.date.locale(lng).format("ddd").slice(0, 3)}
        </span>
        <div className={`month-day-container ${isToday && "today"}`}>
          <span
            className={`month-day ${isToday && "today"}`}
            data-testid={`date-header-day-${periodDate.date.format(
              "YYYY-MM-DD",
            )}`}
          >
            {periodDate.date.format("DD")}
          </span>
        </div>
        <RoleBased
          role={teamWithMembership.membership.role}
          allowedRoles={[TeamMembershipRole.OWNER]}
        >
          {periodDate.scheduleStatus !== null && (
            <ScheduleStatusLogo
              scheduleStatus={periodDate.scheduleStatus}
              lng={lng}
            />
          )}
        </RoleBased>
        {isSelectionActive && (
          <Checkbox
            size="small"
            checked={isColumnSelected}
            indeterminate={isColumnIndeterminate}
            onChange={() =>
              onColumnSelect?.(dateStr, rowIds ?? [], selectionScope ?? "view")
            }
            onClick={(e) => e.stopPropagation()}
            data-testid={`date-column-checkbox-${dateStr}`}
            sx={{ padding: "2px", display: "block", margin: "0 auto" }}
          />
        )}
        {isCustomSolveModeActive && (
          <Tooltip title="Select column for custom solve">
            <button
              data-testid={`date-column-sparkle-${dateStr}`}
              onClick={(e) => {
                e.stopPropagation();
                onCustomColumnSelect?.(dateStr, rowIds ?? []);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "block",
                margin: "0 auto",
                padding: "2px",
                color: "#1976d2",
              }}
            >
              <Sparkle size={14} />
            </button>
          </Tooltip>
        )}
      </div>
    </TableCell>
  );
}
