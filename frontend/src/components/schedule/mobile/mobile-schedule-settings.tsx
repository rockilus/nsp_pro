import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
// Components
import { RoleBased } from "@/components/access/role-based";
// Types
import { TeamMembershipRole } from "@/types/team";

type ScheduleView = "worker" | "team";

interface MobileScheduleSettingsProps {
  open: boolean;
  onClose: () => void;
  workers: any[];
  selectedWorkerId: string | null;
  onWorkerChange: (workerId: string) => void;
  selectedView: ScheduleView;
  onViewChange: (view: ScheduleView) => void;
  lng: string;
  userRole: TeamMembershipRole;
}

export default function MobileScheduleSettings({
  open,
  onClose,
  workers,
  selectedWorkerId,
  onWorkerChange,
  selectedView,
  onViewChange,
  lng,
  userRole,
}: MobileScheduleSettingsProps) {
  const { t } = useTranslation(lng, "schedule-page");

  return (
    <Dialog
      data-testid="mobile-schedule-settings-dialog"
      open={open}
      onClose={onClose}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {/* View Toggle */}
          <Box>
            <ToggleButtonGroup
              data-testid="mobile-view-toggle"
              color="primary"
              value={selectedView}
              exclusive
              onChange={(event, newView) => {
                if (newView !== null) {
                  onViewChange(newView);
                }
              }}
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton
                data-testid="mobile-view-worker-button"
                value="worker"
                sx={{
                  textTransform: "none",
                  height: "36px",
                  fontSize: "0.875rem",
                }}
              >
                My schedule
              </ToggleButton>
              <ToggleButton
                data-testid="mobile-view-team-button"
                value="team"
                sx={{
                  textTransform: "none",
                  height: "36px",
                  fontSize: "0.875rem",
                }}
              >
                Team schedule
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Worker Selector - Only for Owners */}
          <RoleBased role={userRole} allowedRoles={[TeamMembershipRole.OWNER]}>
            <FormControl fullWidth>
              <InputLabel id="mobile-worker-select-label">
                {t("worker") || "Worker"}
              </InputLabel>
              <Select
                data-testid="mobile-worker-select"
                labelId="mobile-worker-select-label"
                value={selectedWorkerId || ""}
                label={t("worker") || "Worker"}
                onChange={(e) => onWorkerChange(String(e.target.value))}
              >
                {workers.map((w: any) => (
                  <MenuItem
                    key={w.id}
                    value={w.id}
                    data-testid={`mobile-worker-option-${w.id}`}
                  >
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </RoleBased>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
