import React, { useState, useRef, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Box from '@mui/material/Box';
import WeekGrid from './week-grid';

dayjs.extend(utc);

interface WeekData {
  week: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  assignmentsByDate: Map<string, any[]>;
}

interface WeekCarouselProps {
  weeks: [WeekData, WeekData, WeekData]; // [prev, current, next]
  shifts: any[];
  today: dayjs.Dayjs;
  setActiveAssignment: (assignment: any) => void;
  setSheetOpen: (open: boolean) => void;
  onWeekChange: (direction: number) => void;
}

export default function WeekCarousel({
  weeks,
  shifts,
  today,
  setActiveAssignment,
  setSheetOpen,
  onWeekChange,
}: WeekCarouselProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeColumnRef = useRef<HTMLDivElement>(null);
  const weekGridRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Touch tracking state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const currentTouchX = useRef<number | null>(null);
  const isHorizontalGesture = useRef<boolean | null>(null);
  const viewportWidth = useRef<number>(0);

  useEffect(() => {
    if (containerRef.current) {
      viewportWidth.current = containerRef.current.offsetWidth;
    }
  }, []);

  // Synchronize scroll between time column and week grids
  const handleScroll = (source: 'time' | 'week', scrollTop: number) => {
    if (source === 'time') {
      // Sync week grids to time column scroll
      weekGridRefs.current.forEach((ref) => {
        if (ref && ref.scrollTop !== scrollTop) {
          ref.scrollTop = scrollTop;
        }
      });
    } else {
      // Sync time column to week grid scroll
      if (timeColumnRef.current && timeColumnRef.current.scrollTop !== scrollTop) {
        timeColumnRef.current.scrollTop = scrollTop;
      }
      // Also sync other week grids
      weekGridRefs.current.forEach((ref) => {
        if (ref && ref.scrollTop !== scrollTop) {
          ref.scrollTop = scrollTop;
        }
      });
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    currentTouchX.current = e.touches[0].clientX;
    isHorizontalGesture.current = null;

    // Update viewport width
    if (containerRef.current) {
      viewportWidth.current = containerRef.current.offsetWidth;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isTransitioning || touchStartX.current === null || touchStartY.current === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    currentTouchX.current = currentX;

    // Determine gesture direction on first move
    if (isHorizontalGesture.current === null) {
      const deltaX = Math.abs(currentX - touchStartX.current);
      const deltaY = Math.abs(currentY - touchStartY.current);

      // Need at least 5px movement to determine direction
      if (deltaX > 5 || deltaY > 5) {
        isHorizontalGesture.current = deltaX > deltaY;
      }
    }

    // Only handle horizontal gestures
    if (isHorizontalGesture.current === true) {
      const offset = currentX - touchStartX.current;
      setDragOffset(offset);

      // Prevent default to stop vertical scrolling during horizontal drag
      e.preventDefault();
    }
  };

  const onTouchEnd = () => {
    if (
      isTransitioning ||
      touchStartX.current === null ||
      currentTouchX.current === null ||
      isHorizontalGesture.current !== true
    ) {
      // Reset state
      touchStartX.current = null;
      touchStartY.current = null;
      currentTouchX.current = null;
      isHorizontalGesture.current = null;
      return;
    }

    const distance = currentTouchX.current - touchStartX.current;
    const threshold = viewportWidth.current * 0.3; // 30% of viewport width

    // Determine if we should navigate or spring back
    const shouldNavigateNext = distance < -threshold;
    const shouldNavigatePrev = distance > threshold;

    if (shouldNavigateNext || shouldNavigatePrev) {
      // Start transition
      setIsTransitioning(true);

      // Animate to the target position
      const targetOffset = shouldNavigateNext ? -viewportWidth.current : viewportWidth.current;
      setDragOffset(targetOffset);

      // After transition completes, notify parent and reset
      setTimeout(() => {
        onWeekChange(shouldNavigateNext ? 1 : -1);
        setDragOffset(0);
        setIsTransitioning(false);
      }, 300); // Match transition duration
    } else {
      // Spring back to center
      setIsTransitioning(true);
      setDragOffset(0);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }

    // Reset touch tracking
    touchStartX.current = null;
    touchStartY.current = null;
    currentTouchX.current = null;
    isHorizontalGesture.current = null;
  };

  // Generate hour labels (00:00 - 23:00) - shared across all weeks
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => dayjs.utc().hour(i).minute(0).format('HH:mm'));
  }, []);

  return (
    <Box
      sx={{
        height: 'calc(100vh - 80px)', // Account for nav bar
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
      }}
    >
      {/* Fixed time column on the left */}
      <Box
        sx={{
          width: '45px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          zIndex: 20,
        }}
      >
        {/* Empty corner space above time labels */}
        <Box
          sx={{
            height: '57px', // Match day header height (padding 8px top+bottom + content)
            borderBottom: '2px solid #e0e0e0',
          }}
        />

        {/* Time labels column */}
        <Box
          ref={timeColumnRef}
          onScroll={(e) => handleScroll('time', (e.target as HTMLDivElement).scrollTop)}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'grid',
            gridTemplateRows: 'repeat(24, 60px)',
          }}
        >
          {hours.map((hour) => (
            <Box
              key={hour}
              sx={{
                padding: '4px 8px',
                fontSize: '0.7rem',
                color: 'text.secondary',
                textAlign: 'right',
                borderTop: '1px solid #e0e0e0',
                height: '60px',
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              {hour}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Scrollable carousel container for weeks */}
      <Box
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        sx={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: '300%',
            height: '100%',
            transform: `translate3d(calc(-33.333% + ${dragOffset}px), 0, 0)`,
            transition: isTransitioning ? 'transform 0.3s ease-out' : 'none',
            willChange: 'transform',
          }}
        >
          {weeks.map((weekData, index) => (
            <Box
              key={`week-${index}-${weekData.week.start.format('YYYY-MM-DD')}`}
              sx={{
                width: '33.333%',
                height: '100%',
                flexShrink: 0,
              }}
            >
              <WeekGrid
                ref={(el) => {
                  weekGridRefs.current[index] = el;
                }}
                week={weekData.week}
                assignmentsByDate={weekData.assignmentsByDate}
                shifts={shifts}
                today={today}
                setActiveAssignment={setActiveAssignment}
                setSheetOpen={setSheetOpen}
                onScroll={(scrollTop) => handleScroll('week', scrollTop)}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
