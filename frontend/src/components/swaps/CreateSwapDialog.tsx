"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  MobileStepper,
  useMediaQuery,
} from "@mui/material";
import dayjs from "dayjs";
import { SwapType } from "../../types/swap";
import { WorkerT } from "../../types/worker";
import { AssignmentDataDictT } from "../../types/assignment";
import { LinkShiftT } from "../../types/shift";
import { TeamMembershipRole } from "../../types/team";
import AssignmentSelector from "./AssignmentSelector";
import { RoleBased } from "../access/role-based";
import { useTheme } from "@mui/material/styles";

interface CreateSwapDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (swapData: {
    offeredAssignmentIds: string[];
    requestedAssignmentIds: string[] | null;
    swapType: SwapType;
    targetWorkerId: string | null;
    comment: string;
  }) => Promise<void>;
  teamId: string;
  currentUserId: string;
  role: TeamMembershipRole | null;
  workers: WorkerT[];
  assignments: AssignmentDataDictT[];
  linkShifts: LinkShiftT[];
}

const steps = [
  "Select offered assignments",
  "Choose swap type",
  "Target details",
  "Add comment",
  "Review & submit",
];

export default function CreateSwapDialog({
  open,
  onClose,
  onSubmit,
  teamId,
  currentUserId,
  role,
  workers,
  assignments,
  linkShifts,
}: CreateSwapDialogProps) {
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

  // Responsive: show compact stepper on small screens
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Initialize selected worker
  useEffect(() => {
    if (open && role === TeamMembershipRole.MEMBER) {
      const currentWorker = workers.find((w) => w.userId === currentUserId);

      if (currentWorker) {
        setSelectedWorkerId(currentWorker.id);
      }
    }
  }, [open, role, currentUserId, workers]);

  // Filter assignment details for review step
  const offeredAssignments = useMemo(() => {
    return assignments.filter((a) =>
      offeredAssignmentIds.includes(a.assignment.id),
    );
  }, [assignments, offeredAssignmentIds]);

  const requestedAssignments = useMemo(() => {
    if (swapType === SwapType.DIRECT && requestedAssignmentIds.length > 0) {
      return assignments.filter((a) =>
        requestedAssignmentIds.includes(a.assignment.id),
      );
    }
    return [];
  }, [assignments, requestedAssignmentIds, swapType]);

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
    // Skip target details step (step 2) for open swaps
    if (activeStep === 1 && swapType === SwapType.OPEN) {
      setActiveStep((prev) => prev + 2);
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    // Skip target details step (step 2) when going back from comment step with open swap
    if (activeStep === 3 && swapType === SwapType.OPEN) {
      setActiveStep((prev) => prev - 2);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      await onSubmit({
        offeredAssignmentIds,
        requestedAssignmentIds:
          swapType === SwapType.DIRECT ? requestedAssignmentIds : null,
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
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        // Step 1: Worker selection and offered assignments
        return (
          <Box>
            <RoleBased role={role} allowedRoles={[TeamMembershipRole.OWNER]}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Worker</InputLabel>
                <Select
                  value={selectedWorkerId}
                  label="Select Worker"
                  onChange={(e) => {
                    setSelectedWorkerId(e.target.value);
                    setOfferedAssignmentIds([]); // Reset selections
                  }}
                  data-testid="worker-select"
                >
                  {workers.map((worker) => (
                    <MenuItem
                      key={worker.id}
                      value={worker.id}
                      data-testid={`worker-option-${worker.id}`}
                    >
                      {worker.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </RoleBased>

            {selectedWorkerId && (
              <Box data-testid="assignment-selector">
                <Typography variant="subtitle2" gutterBottom>
                  Select Assignments to Offer
                </Typography>
                <AssignmentSelector
                  selectedAssignmentIds={offeredAssignmentIds}
                  onSelectionChange={setOfferedAssignmentIds}
                  assignments={assignments.filter(
                    (a) =>
                      a.assignment.workerId === selectedWorkerId &&
                      a.assignment.date.isAfter(dayjs(), "day"),
                  )}
                  linkShifts={linkShifts}
                  allowMultiple={true}
                />
              </Box>
            )}
          </Box>
        );

      case 1:
        // Step 2: Swap type selection
        return (
          <Box>
            <Typography
              variant="subtitle1"
              gutterBottom
              data-testid="swap-type-heading"
            >
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
                  control={<Radio data-testid="direct-swap-radio" />}
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
                  control={<Radio data-testid="open-swap-radio" />}
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
                    <MenuItem
                      key={worker.id}
                      value={worker.id}
                      data-testid={`worker-option-${worker.id}`}
                    >
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
                  selectedAssignmentIds={requestedAssignmentIds}
                  onSelectionChange={setRequestedAssignmentIds}
                  assignments={assignments.filter(
                    (a) =>
                      a.assignment.workerId === targetWorkerId &&
                      a.assignment.date.isAfter(dayjs(), "day"),
                  )}
                  linkShifts={linkShifts}
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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      data-testid="create-swap-dialog"
    >
      <DialogTitle>Create Swap Request</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {isMobile ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {steps[Math.min(activeStep, steps.length - 1)]}
              </Typography>
              <MobileStepper
                variant="dots"
                steps={steps.length}
                position="static"
                activeStep={activeStep}
                sx={{ bgcolor: "transparent" }}
              />
            </Box>
          ) : (
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {renderStepContent()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={loading}
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            disabled={loading}
            data-testid="back-button"
          >
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={loading}
            data-testid="next-button"
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
            data-testid="submit-button"
          >
            {loading ? "Creating..." : "Create Swap"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
