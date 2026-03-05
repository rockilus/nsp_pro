import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import Tooltip from "@mui/material/Tooltip";
// Components
import { RoleBased } from "@/components/access/role-based";
// Styles
import "./worker-row-header-cell.css";
// Types
import { ShiftT, ShiftType } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import { ScheduleT } from "../../../../types/schedule";
import { AssignmentT } from "@/types/assignment";
import { TeamWithMembership, TeamMembershipRole } from "@/types/team";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function WorkerRowHeaderCell({
  lng,
  shifts,
  worker,
  assignments,
  scheduleCampaign,
  teamWithMembership,
  isSelectionActive,
  onRowSelect,
  isRowSelected,
  isRowIndeterminate,
}: {
  lng: string;
  shifts: ShiftT[];
  worker: WorkerT;
  assignments: AssignmentT[];
  scheduleCampaign: ScheduleT | null;
  teamWithMembership: TeamWithMembership;
  isSelectionActive?: boolean;
  onRowSelect?: () => void;
  isRowSelected?: boolean;
  isRowIndeterminate?: boolean;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const assignmentsWorker = scheduleCampaign
    ? assignments.filter(
        (assignment) =>
          assignment.workerId === worker.id &&
          assignment.date.isSameOrAfter(scheduleCampaign.startDate, "day") &&
          assignment.date.isSameOrBefore(scheduleCampaign.endDate, "day"),
      )
    : [];

  const shiftMap: { [key: string]: ShiftT } = shifts.reduce(
    (map, shift) => {
      map[shift.id] = shift;
      return map;
    },
    {} as { [key: string]: ShiftT },
  );

  const calcWeeklyWorkTimeActual = () => {
    if (!scheduleCampaign) return 0;
    const workerTotalWorkTimeActual = assignmentsWorker.reduce(
      (acc, assignment) => {
        const shift = shiftMap[assignment.shiftId];
        if (
          shift &&
          (shift.shiftType === ShiftType.NORMAL ||
            shift.shiftType === ShiftType.DUTY)
        ) {
          const duration = shift.endTime.diff(shift.startTime, "hour", true);
          return acc + duration;
        }
        return acc;
      },
      0,
    );
    const numWeeksSchedule =
      (scheduleCampaign.endDate.diff(scheduleCampaign.startDate, "day") + 1) /
      7;
    return workerTotalWorkTimeActual / numWeeksSchedule;
  };

  const calcDutiesPerMonthActual = () => {
    if (!scheduleCampaign) return 0;
    const workerTotalDutiesActual = assignmentsWorker.reduce(
      (acc, assignment) => {
        const shift = shiftMap[assignment.shiftId];
        if (shift && shift.shiftType === ShiftType.DUTY) {
          return acc + 1;
        }
        return acc;
      },
      0,
    );
    const numMonthsSchedule = scheduleCampaign.endDate.diff(
      scheduleCampaign.startDate,
      "month",
      true,
    );
    return workerTotalDutiesActual / numMonthsSchedule;
  };

  const workerWeeklyWorkTimeActual = calcWeeklyWorkTimeActual();
  const workerDutiesPerMonthActual = calcDutiesPerMonthActual();

  return (
    <TableCell
      data-testid={`worker-row-header-${worker.id}`}
      sx={{
        position: "sticky",
        left: 0,
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #e0e0e07d",
        padding: 0,
      }}
    >
      <div className="worker-row-header-cell-container">
        {isSelectionActive && (
          <Checkbox
            size="small"
            checked={!!isRowSelected}
            indeterminate={isRowIndeterminate}
            onChange={onRowSelect}
            onClick={(e) => e.stopPropagation()}
            sx={{ padding: "2px", flexShrink: 0 }}
          />
        )}
        <div className="worker-row-header-cell-content">
          <span
            className="worker-name"
            data-testid={`worker-name-${worker.id}`}
          >{`${worker.name} (${worker.acronym})`}</span>
          <RoleBased
            role={teamWithMembership.membership.role}
            allowedRoles={[TeamMembershipRole.OWNER]}
          >
            {scheduleCampaign && (
              <Tooltip title={t("h/week_tooltip")} placement="right" arrow>
                <div
                  className="worker-stats-item"
                  data-testid={`worker-stats-hours-${worker.id}`}
                >
                  <div
                    className={`worker-stats-container ${
                      workerWeeklyWorkTimeActual > worker.weeklyHoursDesired &&
                      "breach"
                    }`}
                  >
                    <span className="worker-stats">
                      {workerWeeklyWorkTimeActual.toFixed(1)}
                    </span>
                    <span className="worker-stats-slash">/</span>
                    <span className="worker-stats">
                      {worker.weeklyHoursDesired}
                    </span>
                  </div>
                  <span className="worker-stats-label">{t("h/week")}</span>
                </div>
              </Tooltip>
            )}
            {scheduleCampaign && (
              <Tooltip
                title={t("duties/month_tooltip")}
                placement="right"
                arrow
              >
                <div
                  className="worker-stats-item"
                  data-testid={`worker-stats-duties-${worker.id}`}
                >
                  <div
                    className={`worker-stats-container ${
                      workerDutiesPerMonthActual > worker.dutiesPerMonth &&
                      "breach"
                    }`}
                  >
                    <span className="worker-stats">
                      {workerDutiesPerMonthActual.toFixed(1)}
                    </span>
                    <span className="worker-stats-slash">/</span>
                    <span className="worker-stats">
                      {worker.dutiesPerMonth}
                    </span>
                  </div>
                  <span className="worker-stats-label">
                    {t("duties/month")}
                  </span>
                </div>
              </Tooltip>
            )}
          </RoleBased>
        </div>
      </div>
    </TableCell>
  );
}
