"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Chip,
  Paper,
} from "@mui/material";
import dayjs from "dayjs";
import { SwapType } from "../../types/swap";
import { WorkerT } from "../../types/worker";
import { AssignmentDataDictT } from "../../types/assignment";
import AssignmentSelector from "./AssignmentSelector";
import { WorkerApi } from "../../app/lib/api/workerApi";
import { AssignmentApi } from "../../app/lib/api/assignmentApi";
import { useApiClient } from "../../app/lib/api-client";

interface CreateSwapDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (swapData: {
    offeredAssignmentIds: string[];
    requestedAssignmentIds: string[];
    swapType: SwapType;
    targetWorkerId: string | null;
    comment: string;
  }) => Promise<void>;
  teamId: string;
  currentUserId: string;
  isLeader: boolean;
}

const steps = [
  "Select Worker & Offered Assignments",
  "Choose Swap Type",
  "Target Details",
  "Add Comment",
  "Review & Submit",
];

export default function CreateSwapDialog({
  open,
  onClose,
  onSubmit,
  teamId,
  currentUserId,
  isLeader,
}: CreateSwapDialogProps) {
  const apiClient = useApiClient();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [offeredAssignmentIds, setOfferedAssignmentIds] = useState<string[]>(
    [],
  );
  const [swapType, setSwapType] = useState<SwapType>(SwapType.DIRECT);
  const [targetWorkerId, setTargetWorkerId] = useState<string>("");
  const [requestedAssignmentIds, setRequestedAssignmentIds] = useState<
    string[]
  >([]);
  const [comment, setComment] = useState<string>("");

  // Data
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [offeredAssignments, setOfferedAssignments] = useState<
    AssignmentDataDictT[]
  >([]);
  const [requestedAssignments, setRequestedAssignments] = useState<
    AssignmentDataDictT[]
  >([]);

  // Load workers
  useEffect(() => {
    if (open && teamId) {
      const loadWorkers = async () => {
        try {
          const workerList = await WorkerApi.getWorkers(
            apiClient,
            teamId,
            undefined,
            false,
          );
          setWorkers(workerList);

          // If not leader, pre-select current user as the worker
          if (!isLeader) {
            const currentWorker = workerList.find(
              (w) => w.id === currentUserId,
            );
            if (currentWorker) {
              setSelectedWorkerId(currentWorker.id);
            }
          }
        } catch (err) {
          console.error("Failed to load workers:", err);
          setError("Failed to load workers");
        }
      };
      loadWorkers();
    }
  }, [open, teamId, currentUserId, isLeader, apiClient]);

  // Load assignment details for review step
  useEffect(() => {
    if (activeStep === 4 && offeredAssignmentIds.length > 0) {
      const loadAssignmentDetails = async () => {
        try {
          const result = await AssignmentApi.getAssignments(
            apiClient,
            teamId,
            false,
            dayjs().subtract(60, "day"),
            dayjs().add(60, "day"),
          );

          // Extract assignments from result
          const allAssignments: AssignmentDataDictT[] =
            result.assignmentsRead.map((assignment) => {
              return {
                assignment,
                worker:
                  workers.find((w) => w.id === assignment.workerId) ||
                  ({} as WorkerT),
                shift: {} as any,
                recurrence: null,
                breaches: [],
                requests: [],
              } as AssignmentDataDictT;
            });

          // Filter offered assignments
          const offered = allAssignments.filter((a) =>
            offeredAssignmentIds.includes(a.assignment.id),
          );
          setOfferedAssignments(offered);

          // Filter requested assignments (if direct swap)
          if (
            swapType === SwapType.DIRECT &&
            requestedAssignmentIds.length > 0
          ) {
            const requested = allAssignments.filter((a) =>
              requestedAssignmentIds.includes(a.assignment.id),
            );
            setRequestedAssignments(requested);
          }
        } catch (err) {
          console.error("Failed to load assignment details:", err);
        }
      };
      loadAssignmentDetails();
    }
  }, [
    activeStep,
    offeredAssignmentIds,
    requestedAssignmentIds,
    swapType,
    teamId,
    apiClient,
  ]);

  const handleNext = () => {
    // Validation before moving to next step
    if (activeStep === 0) {
      if (!selectedWorkerId) {
        setError("Please select a worker");
        return;
      }
      if (offeredAssignmentIds.length === 0) {
        setError("Please select at least one assignment to offer");
        return;
      }
    }

    if (activeStep === 2 && swapType === SwapType.DIRECT) {
      if (!targetWorkerId) {
        setError("Please select a target worker");
        return;
      }
      if (requestedAssignmentIds.length === 0) {
        setError("Please select at least one requested assignment");
        return;
      }
    }

    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      await onSubmit({
        offeredAssignmentIds,
        requestedAssignmentIds:
          swapType === SwapType.DIRECT ? requestedAssignmentIds : [],
        swapType,
        targetWorkerId: swapType === SwapType.DIRECT ? targetWorkerId : null,
        comment,
      });

      handleClose();
    } catch (err) {
      console.error("Failed to create swap:", err);
      setError(err instanceof Error ? err.message : "Failed to create swap");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setActiveStep(0);
    setSelectedWorkerId("");
    setOfferedAssignmentIds([]);
    setSwapType(SwapType.DIRECT);
    setTargetWorkerId("");
    setRequestedAssignmentIds([]);
    setComment("");
    setError(null);
    setOfferedAssignments([]);
    setRequestedAssignments([]);
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        // Step 1: Worker selection and offered assignments
        return (
          <Box>
            {isLeader && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Worker</InputLabel>
                <Select
                  value={selectedWorkerId}
                  label="Select Worker"
                  onChange={(e) => {
                    setSelectedWorkerId(e.target.value);
                    setOfferedAssignmentIds([]); // Reset selections
                  }}
                >
                  {workers.map((worker) => (
                    <MenuItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {!isLeader && selectedWorkerId && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Creating swap for:{" "}
                {workers.find((w) => w.id === selectedWorkerId)?.name}
              </Alert>
            )}

            {selectedWorkerId && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Select Assignments to Offer
                </Typography>
                <AssignmentSelector
                  teamId={teamId}
                  selectedAssignmentIds={offeredAssignmentIds}
                  onSelectionChange={setOfferedAssignmentIds}
                  workerId={selectedWorkerId}
                  minDate={dayjs()}
                  allowMultiple={true}
                />
              </>
            )}
          </Box>
        );

      case 1:
        // Step 2: Swap type selection
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Choose Swap Type
            </Typography>
            <RadioGroup
              value={swapType}
              onChange={(e) => {
                setSwapType(e.target.value as SwapType);
                // Reset step 3 data when changing type
                setTargetWorkerId("");
                setRequestedAssignmentIds([]);
              }}
            >
              <Paper sx={{ p: 2, mb: 2 }}>
                <FormControlLabel
                  value={SwapType.DIRECT}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Direct Swap
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Exchange assignments with a specific worker
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
              <Paper sx={{ p: 2 }}>
                <FormControlLabel
                  value={SwapType.OPEN}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Open Swap
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Let any worker bid with their own assignments
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </RadioGroup>
          </Box>
        );

      case 2:
        // Step 3: Target details (only for direct swap)
        if (swapType === SwapType.OPEN) {
          return (
            <Alert severity="info">
              For open swaps, workers will bid with their own assignments. Click
              Next to continue.
            </Alert>
          );
        }

        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Target Worker</InputLabel>
              <Select
                value={targetWorkerId}
                label="Select Target Worker"
                onChange={(e) => {
                  setTargetWorkerId(e.target.value);
                  setRequestedAssignmentIds([]); // Reset selections
                }}
              >
                {workers
                  .filter((w) => w.id !== selectedWorkerId)
                  .map((worker) => (
                    <MenuItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {targetWorkerId && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Select Requested Assignments
                </Typography>
                <AssignmentSelector
                  teamId={teamId}
                  selectedAssignmentIds={requestedAssignmentIds}
                  onSelectionChange={setRequestedAssignmentIds}
                  workerId={targetWorkerId}
                  minDate={dayjs()}
                  allowMultiple={true}
                />
              </>
            )}
          </Box>
        );

      case 3:
        // Step 4: Comment
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Add a Comment (Optional)
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add any additional information about this swap..."
              variant="outlined"
            />
          </Box>
        );

      case 4:
        // Step 5: Review
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Swap Details
            </Typography>

            {/* Swap Type */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Swap Type
              </Typography>
              <Chip
                label={
                  swapType === SwapType.DIRECT ? "Direct Swap" : "Open Swap"
                }
                color="primary"
                sx={{ mt: 0.5 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Worker */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Worker
              </Typography>
              <Typography variant="body1">
                {workers.find((w) => w.id === selectedWorkerId)?.name}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Offered Assignments */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Offered Assignments ({offeredAssignments.length})
              </Typography>
              {offeredAssignments.map((data) => (
                <Paper key={data.assignment.id} sx={{ p: 1, mb: 1 }}>
                  <Typography variant="body2">
                    {data.assignment.date.format("MMM D, YYYY")} -{" "}
                    {data.shift.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.shift.startTime.format("HH:mm")} -{" "}
                    {data.shift.endTime.format("HH:mm")}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {/* Requested Assignments (Direct Swap only) */}
            {swapType === SwapType.DIRECT && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Requested Assignments ({requestedAssignments.length})
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    From: {workers.find((w) => w.id === targetWorkerId)?.name}
                  </Typography>
                  {requestedAssignments.map((data) => (
                    <Paper key={data.assignment.id} sx={{ p: 1, mb: 1 }}>
                      <Typography variant="body2">
                        {data.assignment.date.format("MMM D, YYYY")} -{" "}
                        {data.shift.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.shift.startTime.format("HH:mm")} -{" "}
                        {data.shift.endTime.format("HH:mm")}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </>
            )}

            {/* Comment */}
            {comment && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Comment
                  </Typography>
                  <Typography variant="body2">{comment}</Typography>
                </Box>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Swap Request</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {renderStepContent()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained" disabled={loading}>
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Swap"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
