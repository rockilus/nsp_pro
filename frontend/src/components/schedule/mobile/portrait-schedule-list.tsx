import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AssignmentListItem from "./assignment-list-item";
import { useTranslation } from "../../../app/i18n/client";

type Props = {
  weeks: { start: any; end: any }[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  weekRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  assignmentsByDate: Map<string, any[]>;
  periodDates: any[];
  shifts: any[];
  today: any;
  setActiveAssignment: (a: any) => void;
  setSheetOpen: (v: boolean) => void;
  onScroll?: () => void;
  lng: string;
};

export default function PortraitScheduleList({
  weeks,
  containerRef,
  weekRefs,
  assignmentsByDate,
  periodDates,
  shifts,
  today,
  setActiveAssignment,
  setSheetOpen,
  onScroll,
  lng,
}: Props) {
  const { t } = useTranslation(lng, "schedule-page");

  return (
    <Box
      ref={containerRef}
      onScroll={onScroll}
      sx={{
        maxHeight: "calc(100vh - 65px)",
        overflowY: "auto",
        pb: 8,
      }}
    >
      {weeks.map((week, wi) => {
        const weekDates: any[] = [];
        let cur = week.start;
        while (cur.isBefore(week.end) || cur.isSame(week.end, "day")) {
          weekDates.push(cur);
          cur = cur.add(1, "day");
        }

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
                {week.start.month() === week.end.month() &&
                week.start.year() === week.end.year()
                  ? `${week.start.format("MMMM D")} - ${week.end.format("D")}`
                  : `${week.start.format("MMMM D")} - ${week.end.format(
                      "MMMM D"
                    )}`}
              </Typography>
            </Box>

            {weekDates.map((d) => {
              const isToday = d.isSame(today, "day");
              const key = d.utc().format("YYYY-MM-DD");
              const items = assignmentsByDate.get(key) || [];

              if (items.length === 0 && !isToday) return null;

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
                        <Typography variant="caption" sx={{ color: "#1a73e8" }}>
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
                          {t("nothing_planned")}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              }

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
                              sx={{ color: isToday ? "#1a73e8" : undefined }}
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
        );
      })}
    </Box>
  );
}
