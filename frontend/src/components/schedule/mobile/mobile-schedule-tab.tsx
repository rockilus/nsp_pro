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
import PortraitScheduleList from "./portrait-schedule-list";

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

  // Build multiple weeks around the current period so the user can scroll across months
  const weeks = useMemo(() => {
    const center = periodStart.startOf("isoWeek");
    const result: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
    const range = 8; // weeks before and after
    for (let i = -range; i <= range; i++) {
      const start = center.add(i, "week");
      const end = start.add(6, "day");
      result.push({ start, end });
    }
    return result;
  }, [periodStart]);

  const today = dayjs.utc();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const weekRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  // On load, scroll to the week that contains today so current date appears at top
  useEffect(() => {
    if (isLoading) return;
    const idx = weeks.findIndex(
      (w) =>
        today.isSameOrAfter(w.start, "day") &&
        today.isSameOrBefore(w.end, "day")
    );
    const target = weekRefs.current[idx >= 0 ? idx : 0];
    if (target && containerRef.current) {
      try {
        const container = containerRef.current as HTMLElement;
        const targetEl = target as HTMLElement;
        const top = targetEl.offsetTop - container.offsetTop;
        container.scrollTo({ top, behavior: "auto" });
      } catch (err) {
        // fallback to bounding rect calculation
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        containerRef.current.scrollTo({
          top: containerRef.current.scrollTop + (targetTop - containerTop),
          behavior: "auto",
        });
      }
    }
  }, [isLoading, weeks, today]);

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

  return (
    <Box sx={{ p: 1 }}>
      {/* Week header (portrait) */}
      {/* Top week header removed for portrait; headers are rendered per-week below */}
      {/* Portrait: grouped by week; each week shows a header and day's assignments */}

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
        <PortraitScheduleList
          weeks={weeks}
          containerRef={containerRef}
          weekRefs={weekRefs}
          assignmentsByDate={assignmentsByDate}
          periodDates={periodDates}
          shifts={shifts}
          today={today}
          setActiveAssignment={setActiveAssignment}
          setSheetOpen={setSheetOpen}
        />
      ) : (
        /* Landscape: simple weekly band */ <Box>To Come</Box>
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
