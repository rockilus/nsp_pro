import React, { useMemo, useEffect, useRef } from "react";
import dayjs from "dayjs";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface DateCarouselProps {
  weeks: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
  today: dayjs.Dayjs;
  selectedDate?: dayjs.Dayjs | null;
  onDateSelect?: (date: dayjs.Dayjs) => void;
  onVisibleMonthChange: (month: string) => void;
  onScrollToTodayReady: (handler: () => void) => void;
}

export default function DateCarousel({
  weeks,
  today,
  selectedDate,
  onDateSelect,
  onVisibleMonthChange,
  onScrollToTodayReady,
}: DateCarouselProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const dateRefs = useRef<Array<HTMLDivElement | null>>([]);
  const hasScrolledRef = useRef(false);

  // Generate all dates from the weeks array
  const allDates = useMemo(() => {
    const dates: dayjs.Dayjs[] = [];
    weeks.forEach((week) => {
      let cur = week.start;
      while (cur.isBefore(week.end) || cur.isSame(week.end, "day")) {
        dates.push(cur);
        cur = cur.add(1, "day");
      }
    });
    return dates;
  }, [weeks]);

  // Find today's index
  const todayIndex = useMemo(() => {
    return allDates.findIndex((d) => d.isSame(today, "day"));
  }, [allDates, today]);

  // Scroll to today on mount
  useEffect(() => {
    if (hasScrolledRef.current || todayIndex === -1 || !carouselRef.current)
      return;

    const todayElement = dateRefs.current[todayIndex];
    if (todayElement) {
      todayElement.scrollIntoView({
        inline: "center",
        behavior: "instant",
      });
      hasScrolledRef.current = true;
    }
  }, [todayIndex]);

  // Track visible month on scroll
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;

      // Find which date is closest to the center
      for (let i = 0; i < dateRefs.current.length; i++) {
        const dateEl = dateRefs.current[i];
        if (!dateEl) continue;

        const rect = dateEl.getBoundingClientRect();
        const dateCenter = rect.left + rect.width / 2;

        // Check if this date's center is close to viewport center
        if (
          Math.abs(dateCenter - centerX) < rect.width &&
          rect.left < centerX &&
          rect.right > centerX
        ) {
          const date = allDates[i];
          const monthLabel = date.format(
            date.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY"
          );
          onVisibleMonthChange(monthLabel);
          break;
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    // Trigger once on mount
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [allDates, onVisibleMonthChange]);

  // Implement scroll-to-today handler
  const handleScrollToToday = React.useCallback(() => {
    if (todayIndex === -1 || !carouselRef.current) return;

    const todayElement = dateRefs.current[todayIndex];
    if (todayElement) {
      todayElement.scrollIntoView({
        inline: "center",
        behavior: "smooth",
      });
      // Also select today's date
      if (onDateSelect) {
        onDateSelect(today);
      }
    }
  }, [todayIndex, onDateSelect, today]);

  // Expose handler to parent
  React.useEffect(() => {
    onScrollToTodayReady(handleScrollToToday);
  }, [handleScrollToToday, onScrollToTodayReady]);

  return (
    <Box
      ref={carouselRef}
      sx={{
        display: "flex",
        overflowX: "auto",
        gap: 2,
        py: 2,
        px: 1,
        mb: 2,
        scrollSnapType: "x mandatory",
        "&::-webkit-scrollbar": {
          display: "none",
        },
        scrollbarWidth: "none",
      }}
    >
      {allDates.map((date, index) => {
        const isToday = date.isSame(today, "day");
        const isSelected = selectedDate?.isSame(date, "day");
        const key = date.format("YYYY-MM-DD");

        return (
          <Box
            key={key}
            ref={(el: HTMLDivElement | null) => {
              dateRefs.current[index] = el;
            }}
            onClick={() => onDateSelect?.(date)}
            sx={{
              minWidth: 64,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              scrollSnapAlign: "center",
              cursor: "pointer",
              backgroundColor: isSelected ? "#e3f2fd" : "transparent",
              borderRadius: isSelected ? "24px" : undefined,
              transition: "background-color 0.2s",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: isToday ? "#1a73e8" : undefined }}
            >
              {date.format("ddd")}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                width: 32,
                height: 32,
                borderRadius: isToday ? "50%" : undefined,
                backgroundColor: isToday ? "#1a73e8" : undefined,
                color: isToday ? "#fff" : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {date.format("D")}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
