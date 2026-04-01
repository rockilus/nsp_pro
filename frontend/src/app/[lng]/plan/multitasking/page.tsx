/**
 * Multitasking Demo Page
 *
 * Demonstrates the multitasking functionality including:
 * - Fetching shift demand concurrency data from the API
 * - Displaying concurrency relationships
 * - Interactive shift selection and compatibility testing
 */

"use client";

import React, { useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Alert,
  Tab,
  Tabs,
  Paper,
} from "@mui/material";
import {
  MultitaskingConcurrencyDisplay,
  MultitaskingSelector,
} from "@/components/multitasking";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MultitaskingPage() {
  // Form state
  const [teamId, setTeamId] = useState("demo-team-001");
  const [startDate, setStartDate] = useState<Dayjs | null>(
    dayjs().subtract(7, "day"), // 7 days ago
  );
  const [endDate, setEndDate] = useState<Dayjs | null>(
    dayjs().add(7, "day"), // 7 days from now
  );
  const [enableQuery, setEnableQuery] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);

  // Helper functions to convert between Date and string
  const formatDateForInput = (date: Dayjs | null): string => {
    if (!date) return "";
    return date.format("YYYY-MM-DD");
  };

  const parseDateFromInput = (dateString: string): Dayjs | null => {
    if (!dateString) return null;
    return dayjs(dateString);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(parseDateFromInput(e.target.value));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(parseDateFromInput(e.target.value));
  };

  const handleSubmit = () => {
    if (!teamId || !startDate || !endDate) {
      return;
    }
    if (!startDate || !endDate || !startDate.isBefore(endDate)) {
      return;
    }
    setEnableQuery(true);
  };

  const handleReset = () => {
    setEnableQuery(false);
    setSelectedShifts([]);
  };

  const isFormValid = Boolean(
    teamId && startDate && endDate && startDate.isBefore(endDate),
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        Multitasking Analysis
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Analyze which shift demands can be worked concurrently by the same
        worker. This helps optimize scheduling by identifying compatible shift
        combinations and enabling multitasking assignments.
      </Typography>

      {/* Configuration Form */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuration
          </Typography>

          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Team ID"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                helperText="Enter the team identifier"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formatDateForInput(startDate)}
                onChange={handleStartDateChange}
                helperText="Period start date"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formatDateForInput(endDate)}
                onChange={handleEndDateChange}
                helperText="Period end date"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  fullWidth
                >
                  Analyze
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  disabled={!enableQuery}
                >
                  Reset
                </Button>
              </Box>
            </Grid>
          </Grid>

          {!isFormValid && teamId && startDate && endDate && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Please ensure end date is after start date.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {enableQuery && teamId && startDate && endDate && (
        <Paper elevation={1} sx={{ borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              aria-label="multitasking analysis tabs"
            >
              <Tab label="Concurrency Overview" />
              <Tab label="Interactive Selector" />
              <Tab label="API Details" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <MultitaskingConcurrencyDisplay
              teamId={teamId}
              startDate={startDate!}
              endDate={endDate!}
              enabled={enableQuery}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <MultitaskingSelector
              teamId={teamId}
              startDate={startDate!}
              endDate={endDate!}
              onSelectionChange={setSelectedShifts}
              enabled={enableQuery}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                API Request Details
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Request Payload:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "grey.50", fontFamily: "monospace" }}
                  >
                    <pre>
                      {JSON.stringify(
                        {
                          team_id: teamId,
                          start_date: startDate ? startDate.unix() : null,
                          end_date: endDate ? endDate.unix() : null,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Endpoint:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "grey.50", fontFamily: "monospace" }}
                  >
                    POST /multitasking/shift-demand-concurrency
                  </Paper>

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Selected Shifts:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "grey.50", fontFamily: "monospace" }}
                  >
                    {selectedShifts.length > 0
                      ? JSON.stringify(selectedShifts, null, 2)
                      : "No shifts selected"}
                  </Paper>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Implementation Notes:</strong>
                  <br />
                  • Dates are converted to Unix timestamps for the API
                  <br />
                  • Response data is automatically cached for 5 minutes
                  <br />
                  • Error handling includes retry logic with exponential backoff
                  <br />• Real-time updates when selection changes
                </Typography>
              </Alert>
            </Box>
          </TabPanel>
        </Paper>
      )}

      {/* Usage Instructions */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How to Use
          </Typography>
          <Typography variant="body2" paragraph>
            1. <strong>Configure:</strong> Enter a team ID and select a date
            range for analysis
          </Typography>
          <Typography variant="body2" paragraph>
            2. <strong>Analyze:</strong> Click &ldquo;Analyze&rdquo; to fetch
            concurrency data from the backend
          </Typography>
          <Typography variant="body2" paragraph>
            3. <strong>Explore:</strong> Use the tabs to view different
            perspectives: • Overview shows all concurrency relationships •
            Selector allows interactive exploration of compatible shifts • API
            Details shows technical implementation details
          </Typography>
          <Typography variant="body2">
            4. <strong>Apply:</strong> Use the insights to create multitasking
            assignments in your scheduling workflow
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
