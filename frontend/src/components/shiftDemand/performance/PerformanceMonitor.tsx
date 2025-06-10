/**
 * Performance monitoring component for shift demand grid
 * Tracks rendering performance and memory usage
 */

"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Typography,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";

// Local performance metrics interface for the monitor
interface LocalPerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  updateCount: number;
  lastUpdate: number;
  averageRenderTime: number;
  peakMemoryUsage: number;
}

const PerformanceContainer = styled(Paper)(({ theme }) => ({
  position: "fixed",
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  width: 300,
  maxHeight: 400,
  zIndex: 1300,
  overflow: "hidden",
  transition: theme.transitions.create(["width", "height"]),
}));

const MetricsGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: theme.spacing(1),
  padding: theme.spacing(1),
}));

const MetricCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  textAlign: "center",
}));

interface PerformanceMonitorProps {
  matrixSize: number;
  cellCount: number;
  updateCount: number;
  onPerformanceIssue?: (issue: string) => void;
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  matrixSize,
  cellCount,
  updateCount,
  onPerformanceIssue,
  enabled = process.env.NODE_ENV === "development",
}) => {
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState<LocalPerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    updateCount: 0,
    lastUpdate: Date.now(),
    averageRenderTime: 0,
    peakMemoryUsage: 0,
  });

  const renderStartRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);
  const memoryCheckInterval = useRef<NodeJS.Timeout>();

  // Performance thresholds
  const RENDER_TIME_WARNING = 16; // 16ms for 60fps
  const MEMORY_WARNING = 100; // 100MB
  const MAX_RENDER_SAMPLES = 10;

  // Start render timing
  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  // End render timing
  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;

    renderTimesRef.current.push(renderTime);
    if (renderTimesRef.current.length > MAX_RENDER_SAMPLES) {
      renderTimesRef.current.shift();
    }

    const averageRenderTime =
      renderTimesRef.current.reduce((sum, time) => sum + time, 0) /
      renderTimesRef.current.length;

    setMetrics((prev: LocalPerformanceMetrics) => ({
      ...prev,
      renderTime,
      averageRenderTime,
      updateCount,
      lastUpdate: Date.now(),
    }));

    // Check for performance issues
    if (renderTime > RENDER_TIME_WARNING && onPerformanceIssue) {
      onPerformanceIssue(`Slow render detected: ${renderTime.toFixed(2)}ms`);
    }
  }, [matrixSize, cellCount, updateCount, onPerformanceIssue]);

  // Memory monitoring
  useEffect(() => {
    if (!enabled || !("memory" in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB

        setMetrics((prev: LocalPerformanceMetrics) => ({
          ...prev,
          memoryUsage,
          peakMemoryUsage: Math.max(prev.peakMemoryUsage, memoryUsage),
        }));

        if (memoryUsage > MEMORY_WARNING && onPerformanceIssue) {
          onPerformanceIssue(`High memory usage: ${memoryUsage.toFixed(1)}MB`);
        }
      }
    };

    checkMemory();
    memoryCheckInterval.current = setInterval(checkMemory, 1000);

    return () => {
      if (memoryCheckInterval.current) {
        clearInterval(memoryCheckInterval.current);
      }
    };
  }, [enabled, onPerformanceIssue]);

  // Performance status
  const performanceStatus = useMemo(() => {
    if (metrics.renderTime > RENDER_TIME_WARNING) return "warning";
    if (metrics.memoryUsage > MEMORY_WARNING) return "warning";
    return "good";
  }, [metrics.renderTime, metrics.memoryUsage]);

  const statusColor = performanceStatus === "warning" ? "warning" : "success";

  if (!enabled) return null;

  return (
    <PerformanceContainer elevation={4}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SpeedIcon fontSize="small" />
          <Typography variant="caption" fontWeight="bold">
            Performance
          </Typography>
          <Chip
            size="small"
            label={performanceStatus}
            color={statusColor}
            variant="outlined"
          />
        </Box>
        <IconButton
          size="small"
          sx={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 1, pt: 0 }}>
          {performanceStatus === "warning" && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              Performance issues detected
            </Alert>
          )}

          <MetricsGrid>
            <MetricCard>
              <Typography variant="caption" color="text.secondary">
                Render Time
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {metrics.renderTime.toFixed(1)}ms
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(
                  (metrics.renderTime / RENDER_TIME_WARNING) * 100,
                  100
                )}
                color={
                  metrics.renderTime > RENDER_TIME_WARNING
                    ? "warning"
                    : "primary"
                }
                sx={{ mt: 0.5, height: 2 }}
              />
            </MetricCard>

            <MetricCard>
              <Typography variant="caption" color="text.secondary">
                Avg Render
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {metrics.averageRenderTime.toFixed(1)}ms
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(
                  (metrics.averageRenderTime / RENDER_TIME_WARNING) * 100,
                  100
                )}
                color={
                  metrics.averageRenderTime > RENDER_TIME_WARNING
                    ? "warning"
                    : "primary"
                }
                sx={{ mt: 0.5, height: 2 }}
              />
            </MetricCard>

            <MetricCard>
              <Typography variant="caption" color="text.secondary">
                Memory
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {metrics.memoryUsage.toFixed(1)}MB
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(
                  (metrics.memoryUsage / MEMORY_WARNING) * 100,
                  100
                )}
                color={
                  metrics.memoryUsage > MEMORY_WARNING ? "warning" : "primary"
                }
                sx={{ mt: 0.5, height: 2 }}
              />
            </MetricCard>

            <MetricCard>
              <Typography variant="caption" color="text.secondary">
                Updates
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {metrics.updateCount}
              </Typography>
            </MetricCard>

            <MetricCard>
              <Typography variant="caption" color="text.secondary">
                Matrix Size
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {matrixSize}
              </Typography>
            </MetricCard>

            <MetricCard>
              <Typography variant="caption" color="text.secondary">
                Cell Count
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {cellCount}
              </Typography>
            </MetricCard>
          </MetricsGrid>

          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <MemoryIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Peak: {metrics.peakMemoryUsage.toFixed(1)}MB
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </PerformanceContainer>
  );
};
