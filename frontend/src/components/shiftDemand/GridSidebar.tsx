/**
 * Sidebar component for the shift demand grid
 * Provides additional controls and shift information
 */

"use client";

import React from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Chip,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { ShiftT, ShiftType } from "@/types/shift";
import { ShiftDemandSummary } from "@/types/shiftDemand";

const SidebarContainer = styled(Drawer)(({ theme }) => ({
  "& .MuiDrawer-paper": {
    position: "relative",
    width: 280,
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
}));

const SidebarContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  height: "100%",
  overflow: "auto",
}));

const ShiftItem = styled(ListItem)<{ isHidden?: boolean }>(
  ({ theme, isHidden }) => ({
    opacity: isHidden ? 0.5 : 1,
    transition: theme.transitions.create("opacity"),
  })
);

interface GridSidebarProps {
  shifts: ShiftT[];
  summary: ShiftDemandSummary;
  hiddenShifts: Set<string>;
  onToggleShiftVisibility: (shiftId: string) => void;
  open?: boolean;
}

export const GridSidebar: React.FC<GridSidebarProps> = ({
  shifts,
  summary,
  hiddenShifts,
  onToggleShiftVisibility,
  open = false,
}) => {
  const visibleShifts = shifts.filter((shift) => !shift.deleted);
  const totalDemands = Object.values(summary).reduce(
    (sum, stats) => sum + stats.total,
    0
  );

  return (
    <SidebarContainer
      variant="persistent"
      anchor="left"
      open={open}
      PaperProps={{
        elevation: 0,
      }}
    >
      <SidebarContent>
        <Typography variant="h6" gutterBottom>
          Shift Overview
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total Demands: <strong>{totalDemands}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Active Shifts: <strong>{visibleShifts.length}</strong>
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Shifts</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense>
              {visibleShifts.map((shift) => {
                const isHidden = hiddenShifts.has(shift.id);
                const shiftSummary = summary[shift.id];

                return (
                  <ShiftItem
                    key={shift.id}
                    isHidden={isHidden}
                    sx={{ pl: 1, pr: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2" component="span">
                            {shift.name}
                          </Typography>
                          {shift.shiftType === ShiftType.DUTY && (
                            <Chip
                              label="Duty"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {shift.shiftType === ShiftType.LEAVE && (
                            <Chip
                              label="Leave"
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        shiftSummary ? (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" display="block">
                              Total: {shiftSummary.total} • Avg:{" "}
                              {shiftSummary.avg_per_day}/day
                            </Typography>
                            <Typography variant="caption" display="block">
                              Active days: {shiftSummary.days_with_demand} •
                              Peak: {shiftSummary.max_per_day}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No demands
                          </Typography>
                        )
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => onToggleShiftVisibility(shift.id)}
                      >
                        {isHidden ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ShiftItem>
                );
              })}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Additional sections can be added here */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Statistics</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Total Demands:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {totalDemands}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Avg per Shift:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {visibleShifts.length > 0
                    ? Math.round(totalDemands / visibleShifts.length)
                    : 0}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Most Demanded:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {
                    Object.entries(summary).reduce(
                      (max, [shiftId, stats]) => {
                        const shift = shifts.find((s) => s.id === shiftId);
                        return stats.total > (max.total || 0)
                          ? {
                              name: shift?.name || "Unknown",
                              total: stats.total,
                            }
                          : max;
                      },
                      { name: "None", total: 0 }
                    ).name
                  }
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </SidebarContent>
    </SidebarContainer>
  );
};
