"use client";

import React, { useEffect, useState } from "react";
import { Alert, Chip, Box, Collapse } from "@mui/material";
import { isNetworkError } from "../../config/cognito";

interface NetworkStatusProps {
  error?: any;
  showDetails?: boolean;
}

export function NetworkStatus({
  error,
  showDetails = false,
}: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [networkErrorCount, setNetworkErrorCount] = useState(0);
  const [lastNetworkError, setLastNetworkError] = useState<string | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    // Update network error tracking from localStorage
    const errorCount = parseInt(
      localStorage.getItem("networkErrorCount") || "0"
    );
    const lastError = localStorage.getItem("lastNetworkError");

    setNetworkErrorCount(errorCount);
    setLastNetworkError(lastError);
  }, [error]);

  const hasNetworkError = error && isNetworkError(error);

  if (!hasNetworkError && isOnline && networkErrorCount === 0) {
    return null; // Don't show anything when everything is fine
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Chip
          label={isOnline ? "Online" : "Offline"}
          color={isOnline ? "success" : "error"}
          size="small"
        />

        {networkErrorCount > 0 && (
          <Chip
            label={`${networkErrorCount} network errors`}
            color="warning"
            size="small"
          />
        )}
      </Box>

      <Collapse in={hasNetworkError || !isOnline}>
        <Alert severity={!isOnline ? "error" : "warning"}>
          {!isOnline
            ? "You appear to be offline. Authentication may not work properly."
            : "Network connectivity issues detected. Token refresh may be affected."}
        </Alert>
      </Collapse>

      {showDetails && (networkErrorCount > 0 || lastNetworkError) && (
        <Collapse in={showDetails}>
          <Box sx={{ mt: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>
              <div>Network errors: {networkErrorCount}</div>
              {lastNetworkError && (
                <div>
                  Last error: {new Date(lastNetworkError).toLocaleTimeString()}
                </div>
              )}
              <div>
                Refresh attempts:{" "}
                {localStorage.getItem("refreshAttempts") || "0"}
              </div>
            </div>
          </Box>
        </Collapse>
      )}
    </Box>
  );
}
