import React, { useState } from "react";
import {
  Box,
  Paper,
  Button,
  IconButton,
  Divider,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import {
  ScheduleSelectionState,
  SelectionScope,
} from "../../../types/scheduleSelection";
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import { ScheduleT } from "../../../types/schedule";

interface ScheduleActionToolbarProps {
  lng: string;
  selectionState: ScheduleSelectionState;
  workers: WorkerT[];
  shifts: ShiftT[];
  scheduleCampaign: ScheduleT | null;
  groupBy: "shift" | "worker";
  onBulkCreate: (id: string) => Promise<void>;
  onBulkUpdate: (id: string) => Promise<void>;
  onBulkToggleFixed: () => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onCancel: () => void;
  scope: SelectionScope;
  onScopeChange: (scope: SelectionScope) => void;
}

export function ScheduleActionToolbar({
  selectionState,
  workers,
  shifts,
  scheduleCampaign,
  groupBy,
  onBulkCreate,
  onBulkUpdate,
  onBulkToggleFixed,
  onBulkDelete,
  onCancel,
  scope,
  onScopeChange,
}: ScheduleActionToolbarProps) {
  const [createId, setCreateId] = useState<string>("");
  const [updateId, setUpdateId] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTogglingFixed, setIsTogglingFixed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // In shift view: pick a worker for create/update; in worker view: pick a shift
  const options = groupBy === "shift" ? workers : shifts;
  const optionLabel = (opt: WorkerT | ShiftT) =>
    "name" in opt ? opt.name : (opt as ShiftT).name;
  const optionId = (opt: WorkerT | ShiftT) => opt.id;

  const cellCount = selectionState.selectedCells.length;
  const assignmentCount = selectionState.selectedAssignmentIds.length;

  const handleCreate = async () => {
    if (!createId) return;
    setIsCreating(true);
    try {
      await onBulkCreate(createId);
      setCreateId("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!updateId) return;
    setIsUpdating(true);
    try {
      await onBulkUpdate(updateId);
      setUpdateId("");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleFixed = async () => {
    setIsTogglingFixed(true);
    try {
      await onBulkToggleFixed();
    } finally {
      setIsTogglingFixed(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setIsDeleting(true);
    try {
      await onBulkDelete();
      setDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Paper
      data-testid="schedule-action-toolbar"
      elevation={2}
      sx={{
        p: 0,
        width: "100%",
        padding: "8px 16px",
        backgroundColor: "primary.50",
        borderTop: "1px solid",
        borderColor: "primary.200",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        flexWrap="wrap"
        minHeight="44px"
      >
        {/* Selection counts */}
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", minWidth: 80 }}
        >
          {cellCount > 0 && `${cellCount} cell${cellCount !== 1 ? "s" : ""}`}
          {cellCount > 0 && assignmentCount > 0 && ", "}
          {assignmentCount > 0 &&
            `${assignmentCount} assignment${assignmentCount !== 1 ? "s" : ""}`}
        </Typography>

        <Divider orientation="vertical" flexItem />

        {/* Create section */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontSize: "0.8rem" }}>
            {groupBy === "shift" ? "Worker" : "Shift"}
          </InputLabel>
          <Select
            value={createId}
            label={groupBy === "shift" ? "Worker" : "Shift"}
            onChange={(e) => setCreateId(e.target.value)}
            sx={{ fontSize: "0.8rem" }}
          >
            {options.map((opt) => (
              <MenuItem
                key={optionId(opt)}
                value={optionId(opt)}
                sx={{ fontSize: "0.8rem" }}
              >
                {optionLabel(opt)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          size="small"
          variant="contained"
          disabled={!createId || cellCount === 0 || isCreating}
          onClick={handleCreate}
          sx={{ fontSize: "0.75rem" }}
        >
          Create
        </Button>

        <Divider orientation="vertical" flexItem />

        {/* Update section */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontSize: "0.8rem" }}>
            {groupBy === "shift" ? "Worker" : "Shift"}
          </InputLabel>
          <Select
            value={updateId}
            label={groupBy === "shift" ? "Worker" : "Shift"}
            onChange={(e) => setUpdateId(e.target.value)}
            sx={{ fontSize: "0.8rem" }}
          >
            {options.map((opt) => (
              <MenuItem
                key={optionId(opt)}
                value={optionId(opt)}
                sx={{ fontSize: "0.8rem" }}
              >
                {optionLabel(opt)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          size="small"
          variant="outlined"
          disabled={!updateId || assignmentCount === 0 || isUpdating}
          onClick={handleUpdate}
          sx={{ fontSize: "0.75rem" }}
        >
          Update
        </Button>

        <Divider orientation="vertical" flexItem />

        {/* Toggle Fixed */}
        <Tooltip title="Toggle fixed/unfixed on selected assignments">
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LockIcon fontSize="small" />}
              disabled={assignmentCount === 0 || isTogglingFixed}
              onClick={handleToggleFixed}
              sx={{ fontSize: "0.75rem" }}
            >
              Toggle Fixed
            </Button>
          </span>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* Delete */}
        {deleteConfirm ? (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="caption" color="error">
              Confirm delete {assignmentCount} assignment
              {assignmentCount !== 1 ? "s" : ""}?
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="error"
              disabled={isDeleting}
              onClick={handleDelete}
              sx={{ fontSize: "0.75rem" }}
            >
              Confirm
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => setDeleteConfirm(false)}
              sx={{ fontSize: "0.75rem" }}
            >
              No
            </Button>
          </Box>
        ) : (
          <Tooltip title="Delete selected assignments">
            <span>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon fontSize="small" />}
                disabled={assignmentCount === 0}
                onClick={handleDelete}
                sx={{ fontSize: "0.75rem" }}
              >
                Delete
              </Button>
            </span>
          </Tooltip>
        )}

        {/* Scope toggle — only when campaign exists */}
        {scheduleCampaign && (
          <>
            <Divider orientation="vertical" flexItem />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={scope}
              onChange={(_, val) => val && onScopeChange(val)}
            >
              <ToggleButton value="view" sx={{ fontSize: "0.7rem" }}>
                View
              </ToggleButton>
              <ToggleButton value="campaign" sx={{ fontSize: "0.7rem" }}>
                Campaign
              </ToggleButton>
            </ToggleButtonGroup>
          </>
        )}

        <Box flex={1} />

        {/* Cancel */}
        <Tooltip title="Exit selection mode">
          <IconButton size="small" onClick={onCancel}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}
