/**
 * Template Manager component for shift demand patterns
 * Allows users to save, load, and manage demand templates
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  Visibility as PreviewIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import {
  DemandTemplate,
  ShiftDemandDTO,
  ShiftDemandMatrix,
} from "@/types/shiftDemand";
import { ShiftT } from "@/types/shift";
import { TemplatePreview } from "./TemplatePreview";
import { CreateTemplateDialog } from "./CreateTemplateDialog";

const TemplateContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  height: "500px",
  minWidth: "600px",
}));

const TemplateList = styled(List)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const CategoryChip = styled(Chip)(({ theme }) => ({
  fontSize: "0.75rem",
  height: 20,
}));

const TemplateItem = styled(ListItem)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

interface TemplateManagerProps {
  open: boolean;
  onClose: () => void;
  templates: DemandTemplate[];
  shifts: ShiftT[];
  currentMatrix?: ShiftDemandMatrix;
  teamId: string;
  onApplyTemplate: (template: DemandTemplate) => void;
  onSaveTemplate: (
    template: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt">
  ) => void;
  onUpdateTemplate: (template: DemandTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onExportTemplate?: (template: DemandTemplate) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  open,
  onClose,
  templates,
  shifts,
  currentMatrix,
  teamId,
  onApplyTemplate,
  onSaveTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onExportTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<DemandTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DemandTemplate | null>(
    null
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter templates based on category and search
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory =
      categoryFilter === "all" || template.category === categoryFilter;
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Get unique categories
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  const handleApplyTemplate = useCallback(
    (template: DemandTemplate) => {
      onApplyTemplate(template);
      onClose();
    },
    [onApplyTemplate, onClose]
  );

  const handleSaveCurrentAsTemplate = useCallback(() => {
    if (!currentMatrix) {
      console.warn("No current matrix to save as template");
      return;
    }
    setShowCreateDialog(true);
  }, [currentMatrix]);

  const handleCreateTemplate = useCallback(
    (templateData: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt">) => {
      onSaveTemplate(templateData);
      setShowCreateDialog(false);
    },
    [onSaveTemplate]
  );

  const handleEditTemplate = useCallback((template: DemandTemplate) => {
    setEditingTemplate(template);
    setShowCreateDialog(true);
  }, []);

  const handleUpdateTemplate = useCallback(
    (templateData: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt">) => {
      if (editingTemplate) {
        onUpdateTemplate({
          ...editingTemplate,
          ...templateData,
          updatedAt: Date.now(),
        });
        setEditingTemplate(null);
        setShowCreateDialog(false);
      }
    },
    [editingTemplate, onUpdateTemplate]
  );

  const handlePreviewTemplate = useCallback((template: DemandTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "normal":
        return "default";
      case "holiday":
        return "warning";
      case "emergency":
        return "error";
      case "weekend":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: "80vh" },
        }}
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Shift Demand Templates</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={handleSaveCurrentAsTemplate}
              disabled={!currentMatrix}
            >
              Save Current
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent>
          <TemplateContainer>
            {/* Filters */}
            <Box display="flex" gap={2} mb={2}>
              <TextField
                size="small"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Templates List */}
            {filteredTemplates.length === 0 ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height={200}
                border={1}
                borderColor="divider"
                borderRadius={1}
              >
                <Typography variant="body2" color="text.secondary">
                  {templates.length === 0
                    ? "No templates available"
                    : "No templates match your filters"}
                </Typography>
              </Box>
            ) : (
              <TemplateList>
                {filteredTemplates.map((template) => (
                  <React.Fragment key={template.id}>
                    <TemplateItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {template.name}
                            </Typography>
                            <CategoryChip
                              label={template.category}
                              color={getCategoryColor(template.category) as any}
                              size="small"
                            />
                            {template.isPublic && (
                              <Chip
                                label="Public"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {template.description || "No description"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Created: {formatDate(template.createdAt)} •
                              {template.demands.length} demands
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="Preview template">
                            <IconButton
                              size="small"
                              onClick={() => handlePreviewTemplate(template)}
                            >
                              <PreviewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Apply template">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleApplyTemplate(template)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Edit template">
                            <IconButton
                              size="small"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {onExportTemplate && (
                            <Tooltip title="Export template">
                              <IconButton
                                size="small"
                                onClick={() => onExportTemplate(template)}
                              >
                                <SaveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Tooltip title="Delete template">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onDeleteTemplate(template.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </TemplateItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </TemplateList>
            )}

            {/* Help Text */}
            <Alert severity="info" sx={{ mt: 2 }}>
              Templates save your current shift demand patterns for reuse. Apply
              a template to quickly set up similar demand patterns for different
              periods.
            </Alert>
          </TemplateContainer>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <TemplatePreview
          open={showPreview}
          onClose={() => setShowPreview(false)}
          template={selectedTemplate}
          shifts={shifts}
          onApply={() => handleApplyTemplate(selectedTemplate)}
        />
      )}

      {/* Create/Edit Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingTemplate(null);
        }}
        onSave={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
        currentMatrix={currentMatrix}
        shifts={shifts}
        teamId={teamId}
        editingTemplate={editingTemplate}
      />
    </>
  );
};
