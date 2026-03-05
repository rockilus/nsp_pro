import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Button,
  ButtonGroup,
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
  Popper,
  Grow,
  ClickAwayListener,
  MenuList,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  ScheduleSelectionState,
  SelectionScope,
} from "../../../types/scheduleSelection";
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import { ScheduleT } from "../../../types/schedule";

type ActionKey = "create" | "update" | "toggleFixed" | "delete";

const ACTION_OPTIONS: { key: ActionKey; label: string }[] = [
  { key: "create", label: "Create Assignments" },
  { key: "update", label: "Update Assignments" },
  { key: "toggleFixed", label: "Toggle Fixed" },
  { key: "delete", label: "Delete Assignments" },
];

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
  const [selectedAction, setSelectedAction] = useState<ActionKey>("create");
  const [entityId, setEntityId] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // In shift view: pick a worker for create/update; in worker view: pick a shift
  const options = groupBy === "shift" ? workers : shifts;
  const optionLabel = (opt: WorkerT | ShiftT) =>
    "name" in opt ? opt.name : (opt as ShiftT).name;
  const optionId = (opt: WorkerT | ShiftT) => opt.id;

  const cellCount = selectionState.selectedCells.length;
  const assignmentCount = selectionState.selectedAssignmentIds.length;

  const needsEntitySelect =
    selectedAction === "create" || selectedAction === "update";

  const entityLabel = groupBy === "shift" ? "worker" : "shift";

  const selectHasError =
    validationError !== null && needsEntitySelect && !entityId;

  const validate = (): string | null => {
    switch (selectedAction) {
      case "create":
        if (cellCount === 0) return "Please select at least one cell.";
        if (!entityId) return `Please select a ${entityLabel}.`;
        return null;
      case "update":
        if (assignmentCount === 0)
          return "Please select at least one assignment.";
        if (!entityId) return `Please select a ${entityLabel}.`;
        return null;
      case "toggleFixed":
      case "delete":
        if (assignmentCount === 0)
          return "Please select at least one assignment.";
        return null;
    }
  };

  const currentActionLabel =
    ACTION_OPTIONS.find((a) => a.key === selectedAction)?.label ?? "";

  const actionIcon: Record<ActionKey, React.ReactNode> = {
    create: <AddIcon fontSize="small" sx={{ color: "text.secondary" }} />,
    update: <EditIcon fontSize="small" sx={{ color: "text.secondary" }} />,
    toggleFixed: (
      <span
        style={{
          width: "20px",
          height: "20px",
          fontSize: "1.0rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🔒
      </span>
    ),
    delete: <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />,
  };

  const handleMainAction = async () => {
    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }
    if (selectedAction === "delete" && !deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setIsLoading(true);
    try {
      switch (selectedAction) {
        case "create":
          await onBulkCreate(entityId);
          setEntityId("");
          break;
        case "update":
          await onBulkUpdate(entityId);
          setEntityId("");
          break;
        case "toggleFixed":
          await onBulkToggleFixed();
          break;
        case "delete":
          await onBulkDelete();
          setDeleteConfirm(false);
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionSelect = (key: ActionKey) => {
    setSelectedAction(key);
    setDropdownOpen(false);
    setDeleteConfirm(false);
    setValidationError(null);
    if (key !== "create" && key !== "update") {
      setEntityId("");
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
        justifyContent="space-between"
        gap={1}
        flexWrap="wrap"
        minHeight="44px"
      >
        {/* 1. Selection counts */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="flex-start"
          gap={1}
          sx={{ flexShrink: 0, flex: 0.3 }}
        >
          <Typography
            variant="body2"
            data-testid="schedule-selection-counts"
            sx={{ color: "text.secondary", minWidth: "160px", flexShrink: 0 }}
          >
            {cellCount > 0 && `${cellCount} cell${cellCount !== 1 ? "s" : ""}`}
            {cellCount > 0 && assignmentCount > 0 && ", "}
            {assignmentCount > 0 &&
              `${assignmentCount} assignment${assignmentCount !== 1 ? "s" : ""}`}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* 2. Target period (scope selector) — grows to fill available space */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={0.5}
          sx={{ flex: 0.4 }}
        >
          {scheduleCampaign && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: "nowrap" }}
              >
                Target period:
              </Typography>
              <ToggleButtonGroup
                size="small"
                color="primary"
                exclusive
                value={scope}
                onChange={(_, val) => val && onScopeChange(val)}
                data-testid="schedule-scope-toggle-group"
              >
                <Tooltip title="Apply actions to the currently visible period">
                  <ToggleButton
                    value="view"
                    data-testid="schedule-scope-view"
                    sx={{ fontSize: "0.7rem", textTransform: "none" }}
                  >
                    View
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Apply actions across the full campaign">
                  <ToggleButton
                    value="campaign"
                    data-testid="schedule-scope-campaign"
                    sx={{ fontSize: "0.7rem", textTransform: "none" }}
                  >
                    Campaign
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            </>
          )}
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* 3. Action area */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="flex-end"
          gap={1}
          sx={{ flexShrink: 0, flex: 0.4 }}
        >
          {needsEntitySelect && (
            <FormControl
              size="small"
              sx={{ minWidth: 160 }}
              error={selectHasError}
            >
              <InputLabel sx={{ fontSize: "0.8rem" }}>
                {groupBy === "shift" ? "Worker" : "Shift"}
              </InputLabel>
              <Select
                value={entityId}
                label={groupBy === "shift" ? "Worker" : "Shift"}
                onChange={(e) => {
                  setEntityId(e.target.value);
                  setValidationError(null);
                }}
                sx={{ fontSize: "0.8rem" }}
                data-testid="schedule-entity-select"
              >
                {options.map((opt) => (
                  <MenuItem
                    key={optionId(opt)}
                    value={optionId(opt)}
                    sx={{ fontSize: "0.8rem" }}
                    data-testid={`schedule-entity-option-${optionId(opt)}`}
                  >
                    {optionLabel(opt)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {deleteConfirm ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="caption" color="error">
                Delete {assignmentCount} assignment
                {assignmentCount !== 1 ? "s" : ""}?
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="error"
                disabled={isLoading}
                onClick={handleMainAction}
                data-testid="schedule-delete-confirm-button"
                sx={{ fontSize: "0.75rem" }}
              >
                Confirm
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => setDeleteConfirm(false)}
                data-testid="schedule-delete-cancel-button"
                sx={{ fontSize: "0.75rem" }}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="flex-start">
              <ButtonGroup
                ref={anchorRef}
                size="small"
                variant="contained"
                color={selectedAction === "delete" ? "error" : "primary"}
              >
                <Button
                  disabled={isLoading}
                  onClick={handleMainAction}
                  data-testid="schedule-action-main-button"
                  sx={{
                    fontSize: "0.75rem",
                    textTransform: "none",
                  }}
                >
                  {currentActionLabel}
                </Button>
                <Button
                  sx={{ px: 0.5 }}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  data-testid="schedule-action-dropdown-toggle"
                >
                  <ArrowDropDownIcon fontSize="small" />
                </Button>
              </ButtonGroup>
              {validationError && (
                <Typography
                  variant="caption"
                  color="error"
                  data-testid="schedule-validation-error"
                  sx={{ mt: 0.5, lineHeight: 1.2 }}
                >
                  {validationError}
                </Typography>
              )}
            </Box>
          )}
        </Box>
        {/* Cancel */}
        <Tooltip title="Exit selection mode">
          <IconButton
            size="small"
            onClick={onCancel}
            data-testid="schedule-close-selection-button"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Popper
        sx={{ zIndex: 1300 }}
        open={dropdownOpen}
        anchorEl={anchorRef.current}
        placement="top-start"
        transition
        disablePortal
      >
        {({ TransitionProps }) => (
          <Grow
            {...TransitionProps}
            style={{ transformOrigin: "center bottom" }}
          >
            <Paper>
              <ClickAwayListener onClickAway={() => setDropdownOpen(false)}>
                <MenuList autoFocusItem dense>
                  {ACTION_OPTIONS.map((action) => (
                    <MenuItem
                      key={action.key}
                      selected={action.key === selectedAction}
                      onClick={() => handleActionSelect(action.key)}
                      data-testid={`schedule-action-option-${action.key}`}
                      sx={{
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {actionIcon[action.key]}
                      <Typography
                        variant="inherit"
                        color={
                          action.key === "delete" ? "error" : "text.primary"
                        }
                      >
                        {action.label}
                      </Typography>
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Paper>
  );
}
