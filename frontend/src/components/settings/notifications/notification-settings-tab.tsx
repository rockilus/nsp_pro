"use client";

import React, { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/app/lib/hooks/useNotifications";
import SnackBarComponent from "@/components/feedback/snack-bar";
import {
  type NotificationCategory,
  type NotificationKey,
  NOTIFICATION_CATEGORY_ORDER,
  NOTIFICATION_KEYS,
  NOTIFICATION_REGISTRY,
} from "@/types/notification";

// MUI
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import NavigationHeader from "@/components/common/navigation-header";
import { useIsMobile, useIsLandscape } from "@/hooks/useIsMobile";

function getStatusLabel(inApp: boolean, email: boolean): string {
  if (!inApp && !email) return "status_off";
  if (inApp && !email) return "status_in_app_only";
  if (!inApp && email) return "status_email_only";
  return "status_in_app_and_email";
}

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

  const handleChange = (
    key: NotificationKey,
    channel: "inApp" | "email",
    value: boolean,
  ) => {
    const updated = {
      ...prefs,
      preferences: {
        ...prefs.preferences,
        [key]: { ...prefs.preferences[key], [channel]: value },
      },
    };
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

  const keysByCategory = NOTIFICATION_KEYS.reduce<
    Partial<Record<NotificationCategory, NotificationKey[]>>
  >((acc, key) => {
    const { category } = NOTIFICATION_REGISTRY[key];
    (acc[category] ??= []).push(key);
    return acc;
  }, {});

  return (
    <Box
      sx={{
        maxWidth: 520,
        mx: "auto",
        mt: 2,
        px: 2,
        maxHeight: "calc(100vh - 64px)",
        overflowY: "auto",
      }}
    >
      <NavigationHeader
        title={t("notification_settings")}
        onBack={() => router.push(`/${lng}/plan/settings`)}
        showBackButton={isMobile && !isLandscape}
      />

      <Box sx={{ mt: 3 }}>
        {NOTIFICATION_CATEGORY_ORDER.filter(
          (cat) => (keysByCategory[cat]?.length ?? 0) > 0,
        ).map((cat) => (
          <Box
            key={cat}
            data-testid={`notification-category-${cat}`}
            sx={{ mb: 3 }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 0.5 }}
            >
              {t(`category_${cat}`)}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {keysByCategory[cat]!.map((key) => {
                const ch = prefs.preferences[key] ?? {
                  inApp: true,
                  email: true,
                };
                return (
                  <Accordion
                    key={key}
                    data-testid={`notification-accordion-${key}`}
                    disableGutters
                    elevation={0}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      "&:not(:last-child)": { borderBottom: 0 },
                      "&::before": { display: "none" },
                    }}
                  >
                    <AccordionSummary
                      data-testid={`notification-accordion-summary-${key}`}
                      expandIcon={<ExpandMoreIcon />}
                    >
                      <Box>
                        <Typography fontWeight={500}>
                          {t(`email_${key}`)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          data-testid={`notification-status-${key}`}
                          data-status={getStatusLabel(ch.inApp, ch.email)}
                        >
                          {t(getStatusLabel(ch.inApp, ch.email))}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <FormControlLabel
                        data-testid={`notification-inapp-row-${key}`}
                        control={
                          <Switch
                            checked={ch.inApp}
                            onChange={(e) =>
                              handleChange(key, "inApp", e.target.checked)
                            }
                          />
                        }
                        label={t("in_app_notifications")}
                        labelPlacement="start"
                        sx={{
                          justifyContent: "space-between",
                          width: "100%",
                          ml: 0,
                        }}
                      />
                      <FormControlLabel
                        data-testid={`notification-email-row-${key}`}
                        control={
                          <Switch
                            checked={ch.email}
                            onChange={(e) =>
                              handleChange(key, "email", e.target.checked)
                            }
                          />
                        }
                        label={t("email_notifications")}
                        labelPlacement="start"
                        sx={{
                          justifyContent: "space-between",
                          width: "100%",
                          ml: 0,
                        }}
                      />
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
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
