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

  // Portrait behavior: render nothing if no assignments in the period
  // Always show today's date in portrait, even if it has no assignments.
  const hasAssignmentsInPeriod =
    periodDates.some(
      (d) =>
        (assignmentsByDate.get(d.utc().format("YYYY-MM-DD")) || []).length > 0
    ) || periodDates.some((d) => d.isSame(today, "day"));

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
        <Box
          ref={containerRef}
          sx={{
            maxHeight: "calc(100vh - 160px)",
            overflowY: "auto",
            pb: 8,
          }}
        >
          {weeks.map((week, wi) => {
            // build dates for this week
            const weekDates: dayjs.Dayjs[] = [];
            let cur = week.start;
            while (cur.isBefore(week.end) || cur.isSame(week.end, "day")) {
              weekDates.push(cur);
              cur = cur.add(1, "day");
            }

            // determine if week has any assignments for the selected worker
            const weekItems = weekDates.flatMap(
              (d) => assignmentsByDate.get(d.utc().format("YYYY-MM-DD")) || []
            );
            if (weekItems.length === 0) return null;

            return (
              <Box
                key={week.start.utc().format("YYYY-MM-DD")}
                ref={(el: HTMLDivElement | null) => {
                  weekRefs.current[wi] = el;
                }}
                sx={{ mb: 2 }}
              >
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle1">
                    {formatWeekHeader(week.start, week.end)}
                  </Typography>
                </Box>

                {weekDates.map((d) => {
                  const isToday = d.isSame(today, "day");
                  const key = d.utc().format("YYYY-MM-DD");
                  const items = assignmentsByDate.get(key) || [];

                  // Hide days with no items, except always show today.
                  if (items.length === 0 && !isToday) return null;

                  // If there are no items but it's today, render a placeholder row.
                  if (items.length === 0 && isToday) {
                    return (
                      <Box key={key} sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 64,
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ color: "#1a73e8" }}
                            >
                              {d.format("ddd")}
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                backgroundColor: "#1a73e8",
                                color: "#fff",
                              }}
                            >
                              {d.format("D")}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2">
                              {"Nothing planned"}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  }

                  // sort items by their shift start time
                  const sorted = [...items].sort((a: any, b: any) => {
                    const sa = shifts.find((s: any) => s.id === a.shiftId);
                    const sb = shifts.find((s: any) => s.id === b.shiftId);
                    if (!sa || !sb) return 0;
                    if (sa.startTime && sb.startTime) {
                      if (sa.startTime.isBefore(sb.startTime)) return -1;
                      if (sa.startTime.isAfter(sb.startTime)) return 1;
                    }
                    return 0;
                  });

                  return (
                    <Box key={key} sx={{ mb: 1 }}>
                      {sorted.map((a: any, idx: number) => (
                        <Box
                          key={a.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 64,
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                          >
                            {idx === 0 ? (
                              <>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: isToday ? "#1a73e8" : undefined,
                                  }}
                                >
                                  {d.format("ddd")}
                                </Typography>
                                <Typography
                                  variant="h6"
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: isToday ? "50%" : undefined,
                                    backgroundColor: isToday
                                      ? "#1a73e8"
                                      : undefined,
                                    color: isToday ? "#fff" : undefined,
                                  }}
                                >
                                  {d.format("D")}
                                </Typography>
                              </>
                            ) : (
                              <Box sx={{ height: 1 }} />
                            )}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <AssignmentListItem
                              assignment={a}
                              shift={shifts.find(
                                (s: any) => s.id === a.shiftId
                              )}
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
