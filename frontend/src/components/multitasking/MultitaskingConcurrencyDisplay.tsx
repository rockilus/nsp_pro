/**
 * MultitaskingConcurrencyDisplay Component
 *
 * Displays shift demand concurrency information for a team and period.
 * Shows which shifts can be worked concurrently by the same worker.
 */

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Paper,
} from "@mui/material";
import { useShiftDemandConcurrency } from "@/app/lib/hooks/useMultitasking";

interface MultitaskingConcurrencyDisplayProps {
  teamId: string;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

export const MultitaskingConcurrencyDisplay: React.FC<
  MultitaskingConcurrencyDisplayProps
> = ({ teamId, startDate, endDate, enabled = true }) => {
  const {
    data: concurrencyList,
    isLoading,
    error,
    isError,
  } = useShiftDemandConcurrency(teamId, startDate, endDate, enabled);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading concurrency data...
        </Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Error loading concurrency data</Typography>
        <Typography variant="body2">
          {error instanceof Error ? error.message : "Unknown error occurred"}
        </Typography>
      </Alert>
    );
  }

  if (!concurrencyList || concurrencyList.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        <Typography variant="h6">No concurrency data found</Typography>
        <Typography variant="body2">
          No shift demands found for the selected period, or no concurrent
          shifts available.
        </Typography>
      </Alert>
    );
  }

  const formatDateRange = () => {
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Shift Concurrency Analysis
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Team: {teamId} | Period: {formatDateRange()}
      </Typography>

      <Typography variant="body2" sx={{ mb: 3 }}>
        Showing {concurrencyList.length} shift demands with concurrency
        information. Shifts that can be worked simultaneously are grouped
        together.
      </Typography>

      <Grid container spacing={2}>
        {concurrencyList.map((concurrency) => (
          <Grid item xs={12} md={6} lg={4} key={concurrency.shiftDemandId}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {concurrency.shiftDemandId}
                </Typography>

                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Can work concurrently with:
                </Typography>

                {concurrency.concurrentShiftDemandIds.length > 0 ? (
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}
                  >
                    {concurrency.concurrentShiftDemandIds.map(
                      (concurrentId) => (
                        <Chip
                          key={concurrentId}
                          label={concurrentId}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      )
                    )}
                  </Box>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mt: 1,
                      bgcolor: "grey.50",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No concurrent shifts available
                    </Typography>
                  </Paper>
                )}

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  {concurrency.concurrentShiftDemandIds.length} concurrent
                  shift(s)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, p: 2, bgcolor: "info.main", borderRadius: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          <strong>💡 Tip:</strong> Workers can be assigned to multiple shifts
          that appear in the same concurrency group. This helps optimize
          scheduling by identifying compatible shift combinations.
        </Typography>
      </Box>
    </Box>
  );
};

export default MultitaskingConcurrencyDisplay;
