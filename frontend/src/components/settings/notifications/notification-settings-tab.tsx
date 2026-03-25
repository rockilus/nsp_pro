"use client";

import React, { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/app/lib/hooks/useNotifications";
import SnackBarComponent from "@/components/feedback/snack-bar";
// MUI
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import NavigationHeader from "@/components/common/navigation-header";
import { useIsMobile, useIsLandscape } from "@/hooks/useIsMobile";

export default function NotificationSettingsTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "notifications");
  const router = useRouter();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();

  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });

  if (isLoading || !prefs) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleChange = (field: keyof typeof prefs, value: boolean) => {
    const updated = { ...prefs, [field]: value };
    update.mutate(updated, {
      onSuccess: () =>
        setSnackbar({
          open: true,
          severity: "success",
          message: t("settings_saved"),
        }),
      onError: () =>
        setSnackbar({
          open: true,
          severity: "error",
          message: t("settings_error"),
        }),
    });
  };

  const masterOff = !prefs.emailEnabled;

  return (
    <Box sx={{ maxWidth: 520, mx: "auto", mt: 2, px: 2 }}>
      <NavigationHeader
        title={t("email_settings")}
        onBack={() => router.push(`/${lng}/plan/settings`)}
        showBackButton={isMobile && !isLandscape}
      />

      <Box sx={{ mt: 3 }}>
        {/* Master toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={prefs.emailEnabled}
              onChange={(e) => handleChange("emailEnabled", e.target.checked)}
            />
          }
          label={<Typography fontWeight={500}>{t("email_enabled")}</Typography>}
        />

        <Divider sx={{ my: 2 }} />

        {/* Per-type toggles */}
        {(
          [
            ["emailSchedulePublished", "email_schedule_published"],
            ["emailSwapRequests", "email_swap_requests"],
            ["emailRequestDecisions", "email_request_decisions"],
            ["emailAssignmentChanges", "email_assignment_changes"],
          ] as [keyof typeof prefs, string][]
        ).map(([field, labelKey]) => (
          <Box key={field} sx={{ pl: 2, mb: 1 }}>
            <FormControlLabel
              disabled={masterOff}
              control={
                <Switch
                  checked={prefs[field] as boolean}
                  onChange={(e) => handleChange(field, e.target.checked)}
                  disabled={masterOff}
                />
              }
              label={t(labelKey)}
            />
          </Box>
        ))}
      </Box>

      <SnackBarComponent
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        handleClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
}
