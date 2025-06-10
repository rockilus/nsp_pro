/**
 * Pattern Library component
 * Manages and displays available demand patterns
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Divider,
  Alert,
} from "@mui/material";
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  GetApp as ExportIcon,
  Visibility as PreviewIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { DemandPattern } from "@/types/shiftDemand";

const LibraryContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const PatternItem = styled(ListItemButton)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const PatternVisual = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
}));

const DayIndicator = styled(Box)<{ value: number }>(({ theme, value }) => ({
  width: "20px",
  height: "20px",
  borderRadius: "3px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.75rem",
  fontWeight: "bold",
  backgroundColor:
    value > 0 ? theme.palette.primary.main : theme.palette.grey[200],
  color:
    value > 0
      ? theme.palette.primary.contrastText
      : theme.palette.text.disabled,
}));

interface PatternLibraryProps {
  patterns: DemandPattern[];
  onPatternSelect?: (pattern: DemandPattern) => void;
  onPatternEdit?: (pattern: DemandPattern) => void;
  onPatternDelete?: (patternName: string) => void;
  onPatternDuplicate?: (pattern: DemandPattern) => void;
  onPatternExport?: (pattern: DemandPattern) => void;
  selectedPattern?: DemandPattern | null;
  readonly?: boolean;
}

export const PatternLibrary: React.FC<PatternLibraryProps> = ({
  patterns,
  onPatternSelect,
  onPatternEdit,
  onPatternDelete,
  onPatternDuplicate,
  onPatternExport,
  selectedPattern,
  readonly = false,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<{
    element: HTMLElement;
    pattern: DemandPattern;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [patternToDelete, setPatternToDelete] = useState<DemandPattern | null>(
    null
  );

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, pattern: DemandPattern) => {
      event.stopPropagation();
      setMenuAnchor({ element: event.currentTarget, pattern });
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handlePatternClick = useCallback(
    (pattern: DemandPattern) => {
      if (onPatternSelect) {
        onPatternSelect(pattern);
      }
    },
    [onPatternSelect]
  );

  const handleEdit = useCallback(() => {
    if (menuAnchor?.pattern && onPatternEdit) {
      onPatternEdit(menuAnchor.pattern);
    }
    handleMenuClose();
  }, [menuAnchor, onPatternEdit, handleMenuClose]);

  const handleDelete = useCallback(() => {
    if (menuAnchor?.pattern) {
      setPatternToDelete(menuAnchor.pattern);
      setDeleteConfirmOpen(true);
    }
    handleMenuClose();
  }, [menuAnchor, handleMenuClose]);

  const handleConfirmDelete = useCallback(() => {
    if (patternToDelete && onPatternDelete) {
      onPatternDelete(patternToDelete.name);
    }
    setDeleteConfirmOpen(false);
    setPatternToDelete(null);
  }, [patternToDelete, onPatternDelete]);

  const handleDuplicate = useCallback(() => {
    if (menuAnchor?.pattern && onPatternDuplicate) {
      onPatternDuplicate(menuAnchor.pattern);
    }
    handleMenuClose();
  }, [menuAnchor, onPatternDuplicate, handleMenuClose]);

  const handleExport = useCallback(() => {
    if (menuAnchor?.pattern && onPatternExport) {
      onPatternExport(menuAnchor.pattern);
    }
    handleMenuClose();
  }, [menuAnchor, onPatternExport, handleMenuClose]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "weekday":
        return "primary";
      case "weekend":
        return "secondary";
      case "holiday":
        return "warning";
      case "custom":
        return "info";
      default:
        return "default";
    }
  };

  const renderPatternVisual = (pattern: number[]) => {
    return (
      <PatternVisual>
        {pattern.map((value, index) => (
          <DayIndicator key={index} value={value}>
            {value > 0 ? value : ""}
          </DayIndicator>
        ))}
      </PatternVisual>
    );
  };

  const calculatePatternStats = (pattern: number[]) => {
    const total = pattern.reduce((sum, value) => sum + value, 0);
    const activeDays = pattern.filter((value) => value > 0).length;
    const maxValue = Math.max(...pattern);
    return { total, activeDays, maxValue };
  };

  if (patterns.length === 0) {
    return (
      <LibraryContainer>
        <Alert severity="info">
          No patterns available. Create patterns to quickly apply common demand
          scenarios.
        </Alert>
      </LibraryContainer>
    );
  }

  return (
    <>
      <LibraryContainer>
        <Typography variant="h6" gutterBottom>
          Pattern Library
        </Typography>

        <List dense>
          {patterns.map((pattern) => {
            const stats = calculatePatternStats(pattern.pattern);
            const isSelected = selectedPattern?.name === pattern.name;

            return (
              <PatternItem
                key={pattern.name}
                onClick={() => handlePatternClick(pattern)}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {pattern.name}
                      </Typography>
                      <Chip
                        label={pattern.category}
                        size="small"
                        color={getCategoryColor(pattern.category) as any}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {pattern.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total: {stats.total} • Active days: {stats.activeDays} •
                        Peak: {stats.maxValue}
                      </Typography>
                      {renderPatternVisual(pattern.pattern)}
                    </Box>
                  }
                />

                {!readonly && (
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, pattern)}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </PatternItem>
            );
          })}
        </List>
      </LibraryContainer>

      {/* Pattern Actions Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handlePatternClick(menuAnchor!.pattern)}>
          <ListItemIcon>
            <PreviewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview Pattern</ListItemText>
        </MenuItem>

        <Divider />

        {onPatternEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Pattern</ListItemText>
          </MenuItem>
        )}

        {onPatternDuplicate && (
          <MenuItem onClick={handleDuplicate}>
            <ListItemIcon>
              <DuplicateIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate Pattern</ListItemText>
          </MenuItem>
        )}

        {onPatternExport && (
          <MenuItem onClick={handleExport}>
            <ListItemIcon>
              <ExportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export Pattern</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {onPatternDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Pattern</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Delete Pattern</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the pattern &quot;
            {patternToDelete?.name}
            &quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
