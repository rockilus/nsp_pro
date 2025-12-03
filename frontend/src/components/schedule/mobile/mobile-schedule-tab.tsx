import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Fab from "@mui/material/Fab";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddIcon from "@mui/icons-material/Add";
// Hooks
import {
  useGetScheduleAssignmentsData,
  useGetScheduleAssignmentsDataNoSolver,
} from "../../../hooks/useSchedule";
import { useScheduleViewSettings } from "../../../app/lib/hooks/useScheduleViewSettings";
import { getDefaultScheduleViewSettings } from "../../../app/lib/utils/scheduleViewSettingsUtils";
import { computePeriodEndDate } from "../../../app/lib/utils/scheduleViewSettingsUtils";
// Types
import { TeamWithMembership } from "@/types/team";
// Local components
import AssignmentListItem from "./assignment-list-item";
import MobileAssignmentSheet from "./mobile-assignment-sheet";

dayjs.extend(utc);
dayjs.extend(isoWeek);

export default function MobileScheduleTab({
  lng,
  teamWithMembership,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const defaultSettings = getDefaultScheduleViewSettings(
    teamWithMembership.team.useSolver
  );

  const [scheduleViewSettings, updateScheduleViewSettings] =
    useScheduleViewSettings(teamWithMembership.team.id, defaultSettings);

  const getScheduleAssignmentsData = useGetScheduleAssignmentsData();
  const getScheduleAssignmentsDataNoSolver =
    useGetScheduleAssignmentsDataNoSolver();

  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);

  const isLandscape = useMediaQuery("(orientation: landscape)");

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setIsLoading(true);
      try {
        if (teamWithMembership.team.useSolver) {
          const { assignments, workers, shifts } =
            await getScheduleAssignmentsData(teamWithMembership.team.id);
          if (!mounted) return;
          setAssignments(assignments);
          setWorkers(workers);
          setShifts(shifts);
          if (!selectedWorkerId && workers.length > 0) {
            // If member, try to preselect user's worker
            const userId =
              (teamWithMembership as any).membership?.userId || null;
            const memberWorker = userId
              ? workers.find((w: any) => w.userId === userId)
              : null;
            setSelectedWorkerId(
              (memberWorker && memberWorker.id) || workers[0].id
            );
          }
        } else {
          const { assignments, workers, shifts } =
            await getScheduleAssignmentsDataNoSolver(
              teamWithMembership.team.id
            );
          if (!mounted) return;
          setAssignments(assignments);
          setWorkers(workers);
          setShifts(shifts);
          if (!selectedWorkerId && workers.length > 0) {
            setSelectedWorkerId(workers[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamWithMembership]);

  const periodStart = scheduleViewSettings.periodStartDate;
  const periodEnd = computePeriodEndDate(
    scheduleViewSettings.periodStartDate,
    scheduleViewSettings.timeFrame
  );

  // Build array of dayjs dates for the period
  const periodDates = useMemo(() => {
    const dates: dayjs.Dayjs[] = [];
    let current = periodStart;
    while (current.isBefore(periodEnd) || current.isSame(periodEnd, "day")) {
      dates.push(current);
      current = current.add(1, "day");
    }
    return dates;
  }, [periodStart, periodEnd]);

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!selectedWorkerId) return map;
    for (const a of assignments) {
      if (a.workerId !== selectedWorkerId) continue;
      const key = dayjs(a.date).utc().format("YYYY-MM-DD");
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [assignments, selectedWorkerId]);

  if (isLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Portrait behavior: render nothing if no assignments in the period
  const hasAssignmentsInPeriod = periodDates.some(
    (d) =>
      (assignmentsByDate.get(d.utc().format("YYYY-MM-DD")) || []).length > 0
  );

  if (!hasAssignmentsInPeriod && !isLandscape) {
    return null;
  }

  const formatWeekHeader = (start: dayjs.Dayjs, end: dayjs.Dayjs) => {
    if (start.month() === end.month() && start.year() === end.year()) {
      return `${start.format("MMMM D")} - ${end.format("D")}`;
    }
    return `${start.format("MMMM D")} - ${end.format("MMMM D")}`;
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Week header (portrait) */}
      {!isLandscape && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle1">
            {formatWeekHeader(periodStart, periodEnd)}
          </Typography>
        </Box>
      )}

      <Box sx={{ mb: 1 }}>
        <FormControl fullWidth>
          <InputLabel id="mobile-worker-select-label">
            {t("worker") || "Worker"}
          </InputLabel>
          <Select
            labelId="mobile-worker-select-label"
            value={selectedWorkerId || ""}
            label={t("worker") || "Worker"}
            onChange={(e) => setSelectedWorkerId(String(e.target.value))}
          >
            {workers.map((w: any) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Portrait: list grouped by date */}
      {!isLandscape ? (
        <Box>
          {periodDates.map((d) => {
            const key = d.utc().format("YYYY-MM-DD");
            const items = assignmentsByDate.get(key) || [];
            if (items.length === 0) return null;
            return (
              <Box key={key} sx={{ mb: 1 }}>
                {items.map((a: any) => (
                  <Box
                    key={a.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Box sx={{ width: 64, textAlign: "center" }}>
                      <Typography variant="caption">
                        {d.format("ddd")}
                      </Typography>
                      <Typography variant="h6">{d.format("D")}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <AssignmentListItem
                        assignment={a}
                        shift={shifts.find((s: any) => s.id === a.shiftId)}
                        onClick={() => {
                          setActiveAssignment(a);
                          setSheetOpen(true);
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      ) : (
        /* Landscape: simple weekly band */ <Box>
          {workers
            .filter((w) => w.id === selectedWorkerId)
            .map((w) => (
              <Box key={w.id} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">{w.name}</Typography>
                <Box sx={{ display: "flex", gap: 1, overflowX: "auto" }}>
                  {periodDates.map((d) => {
                    const key = d.utc().format("YYYY-MM-DD");
                    const items = assignmentsByDate.get(key) || [];
                    return (
                      <Box
                        key={key}
                        sx={{
                          minWidth: 120,
                          border: "1px solid rgba(0,0,0,0.04)",
                          p: 1,
                        }}
                      >
                        <Typography variant="caption">
                          {d.format("dd D")}
                        </Typography>
                        {items.map((a: any) => (
                          <AssignmentListItem
                            key={a.id}
                            assignment={a}
                            shift={shifts.find((s: any) => s.id === a.shiftId)}
                            onClick={() => {
                              setActiveAssignment(a);
                              setSheetOpen(true);
                            }}
                          />
                        ))}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))}
        </Box>
      )}

      <Fab
        color="primary"
        aria-label="create-assignment"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => {
          setActiveAssignment(null);
          setSheetOpen(true);
        }}
      >
        <AddIcon />
      </Fab>

      <MobileAssignmentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        assignment={activeAssignment}
      />
    </Box>
  );
}
