/**
 * MultitaskingSelector Component
 *
 * Interactive component that allows users to select shift demands and see
 * which other shifts can be worked concurrently. Useful for manual scheduling
 * and understanding shift compatibility.
 */

import React, { useState, useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
  Grid,
  Paper,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import {
  useShiftDemandConcurrency,
  getCompatibleShiftDemands,
  canWorkConcurrently,
} from '@/app/lib/hooks/useMultitasking';

interface MultitaskingSelectorProps {
  teamId: string;
  startDate: Dayjs;
  endDate: Dayjs;
  onSelectionChange?: (selectedShiftDemandIds: string[]) => void;
  enabled?: boolean;
}

export const MultitaskingSelector: React.FC<MultitaskingSelectorProps> = ({
  teamId,
  startDate,
  endDate,
  onSelectionChange,
  enabled = true,
}) => {
  const [selectedShiftDemands, setSelectedShiftDemands] = useState<string[]>([]);

  const {
    data: concurrencyList,
    isLoading,
    error,
    isError,
  } = useShiftDemandConcurrency(teamId, startDate, endDate, enabled);

  // Get all unique shift demand IDs
  const allShiftDemandIds = useMemo(() => {
    if (!concurrencyList) return [];
    return Array.from(new Set(concurrencyList.map((item) => item.shiftDemandId)));
  }, [concurrencyList]);

  // Get compatible shift demands based on current selection
  const compatibleShiftDemands = useMemo(() => {
    if (!concurrencyList) return [];
    return getCompatibleShiftDemands(concurrencyList, selectedShiftDemands);
  }, [concurrencyList, selectedShiftDemands]);

  const handleShiftDemandToggle = (shiftDemandId: string) => {
    const newSelection = selectedShiftDemands.includes(shiftDemandId)
      ? selectedShiftDemands.filter((id) => id !== shiftDemandId)
      : [...selectedShiftDemands, shiftDemandId];

    setSelectedShiftDemands(newSelection);
    onSelectionChange?.(newSelection);
  };

  const clearSelection = () => {
    setSelectedShiftDemands([]);
    onSelectionChange?.([]);
  };

  const isShiftDemandSelectable = (shiftDemandId: string): boolean => {
    if (selectedShiftDemands.includes(shiftDemandId)) return true;
    return compatibleShiftDemands.includes(shiftDemandId);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading shift concurrency data...</Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  if (!concurrencyList || allShiftDemandIds.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No shift demands found for the selected period.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Multitasking Shift Selector
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Select shift demands to see which other shifts can be worked concurrently by the same
        worker.
      </Typography>

      <Grid container spacing={3}>
        {/* Selection Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6">Available Shift Demands</Typography>
                {selectedShiftDemands.length > 0 && (
                  <Button size="small" onClick={clearSelection} color="secondary">
                    Clear Selection
                  </Button>
                )}
              </Box>

              <FormGroup>
                {allShiftDemandIds.map((shiftDemandId) => {
                  const isSelected = selectedShiftDemands.includes(shiftDemandId);
                  const isSelectable = isShiftDemandSelectable(shiftDemandId);

                  return (
                    <FormControlLabel
                      key={shiftDemandId}
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleShiftDemandToggle(shiftDemandId)}
                          disabled={!isSelectable}
                        />
                      }
                      label={
                        <Typography
                          variant="body2"
                          color={isSelectable ? 'text.primary' : 'text.disabled'}
                        >
                          {shiftDemandId}
                        </Typography>
                      }
                    />
                  );
                })}
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Selection Results
              </Typography>

              {selectedShiftDemands.length > 0 ? (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Shifts ({selectedShiftDemands.length}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {selectedShiftDemands.map((id) => (
                      <Chip
                        key={id}
                        label={id}
                        onDelete={() => handleShiftDemandToggle(id)}
                        color="primary"
                        size="small"
                      />
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Additional Compatible Shifts ({compatibleShiftDemands.length}):
                  </Typography>
                  {compatibleShiftDemands.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {compatibleShiftDemands.map((id) => (
                        <Chip
                          key={id}
                          label={id}
                          variant="outlined"
                          color="secondary"
                          size="small"
                          onClick={() => handleShiftDemandToggle(id)}
                          clickable
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No additional compatible shifts available.
                    </Typography>
                  )}

                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: 'success.main',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" color="success.contrastText">
                      <strong>✓ Multitasking Group:</strong> All{' '}
                      {selectedShiftDemands.length + compatibleShiftDemands.length} shifts can be
                      assigned to the same worker.
                    </Typography>
                  </Box>
                </>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor: 'grey.50',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Select shift demands to see compatibility analysis
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary Stats */}
      {concurrencyList && (
        <Box sx={{ mt: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Summary Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h4" color="primary">
                    {allShiftDemandIds.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Shifts
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h4" color="secondary">
                    {concurrencyList.filter((c) => c.concurrentShiftDemandIds.length > 0).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    With Concurrency
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h4" color="info.main">
                    {Math.round(
                      concurrencyList.reduce(
                        (sum, c) => sum + c.concurrentShiftDemandIds.length,
                        0,
                      ) / concurrencyList.length,
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Concurrent
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="h4" color="success.main">
                    {selectedShiftDemands.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selected
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default MultitaskingSelector;
