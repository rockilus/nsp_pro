/**
 * Connection status monitor for shift demand grid
 * Tracks online/offline status and provides user feedback
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  Chip,
  IconButton,
  Collapse,
  LinearProgress,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  Sync as SyncIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

interface ConnectionStatusProps {
  onRetryConnection?: () => void;
  onOfflineDataSync?: () => void;
  className?: string;
}

interface ConnectionState {
  isOnline: boolean;
  isConnecting: boolean;
  lastConnected: Date | null;
  retryCount: number;
  hasOfflineData: boolean;
}

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
  isConnecting: boolean;
  hasOfflineData: boolean;
  onRetry?: () => void;
}

// Hook for managing connection status
export const useConnectionStatus = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: navigator.onLine,
    isConnecting: false,
    lastConnected: navigator.onLine ? new Date() : null,
    retryCount: 0,
    hasOfflineData: false,
  });

  const handleOnline = useCallback(() => {
    setConnectionState((prev) => ({
      ...prev,
      isOnline: true,
      isConnecting: false,
      lastConnected: new Date(),
      retryCount: 0,
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setConnectionState((prev) => ({
      ...prev,
      isOnline: false,
      isConnecting: false,
    }));
  }, []);

  const startConnecting = useCallback(() => {
    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      retryCount: prev.retryCount + 1,
    }));
  }, []);

  const setHasOfflineData = useCallback((hasData: boolean) => {
    setConnectionState((prev) => ({
      ...prev,
      hasOfflineData: hasData,
    }));
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    ...connectionState,
    startConnecting,
    setHasOfflineData,
  };
};

// Network status indicator component
export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  isOnline,
  isConnecting,
  hasOfflineData,
  onRetry,
}) => {
  const getStatusColor = () => {
    if (isConnecting) return "warning";
    if (isOnline) return "success";
    return "error";
  };

  const getStatusIcon = () => {
    if (isConnecting) return <SyncIcon />;
    if (isOnline) return <WifiIcon />;
    return <WifiOffIcon />;
  };

  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (isOnline) return "Online";
    return "Offline";
  };

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2">
            Connection Status: {getStatusText()}
          </Typography>
          {!isOnline && hasOfflineData && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              You have unsaved changes that will be synced when reconnected.
            </Typography>
          )}
          {!isOnline && onRetry && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Click to retry connection
            </Typography>
          )}
        </Box>
      }
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: !isOnline && onRetry ? "pointer" : "default",
        }}
        onClick={!isOnline && onRetry ? onRetry : undefined}
      >
        <Badge
          variant="dot"
          color={hasOfflineData ? "error" : "default"}
          invisible={!hasOfflineData}
        >
          <Chip
            icon={getStatusIcon()}
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            variant={isOnline ? "filled" : "outlined"}
          />
        </Badge>
      </Box>
    </Tooltip>
  );
};

// Main connection status monitor component
export const ConnectionStatusMonitor: React.FC<ConnectionStatusProps> = ({
  onRetryConnection,
  onOfflineDataSync,
  className,
}) => {
  const {
    isOnline,
    isConnecting,
    lastConnected,
    retryCount,
    hasOfflineData,
    startConnecting,
    setHasOfflineData,
  } = useConnectionStatus();

  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showReconnectedAlert, setShowReconnectedAlert] = useState(false);
  const [showOfflineDataAlert, setShowOfflineDataAlert] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Handle online/offline state changes
  useEffect(() => {
    if (!isOnline && !wasOffline) {
      setShowOfflineAlert(true);
      setWasOffline(true);
    } else if (isOnline && wasOffline) {
      setShowOfflineAlert(false);
      setShowReconnectedAlert(true);
      setWasOffline(false);

      // Auto-hide reconnected alert after 3 seconds
      setTimeout(() => {
        setShowReconnectedAlert(false);
      }, 3000);
    }
  }, [isOnline, wasOffline]);

  // Show offline data alert when there's unsaved data
  useEffect(() => {
    if (hasOfflineData && isOnline) {
      setShowOfflineDataAlert(true);
    } else {
      setShowOfflineDataAlert(false);
    }
  }, [hasOfflineData, isOnline]);

  const handleRetryConnection = useCallback(async () => {
    if (onRetryConnection) {
      startConnecting();
      try {
        await onRetryConnection();
      } catch (error) {
        console.error("Connection retry failed:", error);
      }
    }
  }, [onRetryConnection, startConnecting]);

  const handleSyncOfflineData = useCallback(async () => {
    if (onOfflineDataSync) {
      try {
        await onOfflineDataSync();
        setHasOfflineData(false);
        setShowOfflineDataAlert(false);
      } catch (error) {
        console.error("Offline data sync failed:", error);
      }
    }
  }, [onOfflineDataSync, setHasOfflineData]);

  const formatLastConnected = () => {
    if (!lastConnected) return "Never";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastConnected.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return lastConnected.toLocaleDateString();
  };

  return (
    <Box className={className}>
      {/* Offline Alert */}
      <Snackbar
        open={showOfflineAlert}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: { xs: 90, sm: 24 } }}
      >
        <Alert
          severity="warning"
          icon={<WifiOffIcon />}
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              {onRetryConnection && (
                <IconButton
                  size="small"
                  onClick={handleRetryConnection}
                  disabled={isConnecting}
                  color="inherit"
                >
                  <RefreshIcon />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={() => setShowOfflineAlert(false)}
                color="inherit"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          }
        >
          <Box>
            <Typography variant="body2" fontWeight="medium">
              You&apos;re working offline
            </Typography>
            <Typography variant="body2">
              Changes will be saved locally and synced when connection is
              restored.
              {retryCount > 0 && ` (Retry attempt: ${retryCount})`}
            </Typography>
            {lastConnected && (
              <Typography variant="caption" display="block">
                Last connected: {formatLastConnected()}
              </Typography>
            )}
            {isConnecting && (
              <LinearProgress
                sx={{ mt: 1, borderRadius: 1, height: 4 }}
                color="inherit"
              />
            )}
          </Box>
        </Alert>
      </Snackbar>

      {/* Reconnected Alert */}
      <Snackbar
        open={showReconnectedAlert}
        autoHideDuration={3000}
        onClose={() => setShowReconnectedAlert(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: { xs: 90, sm: 24 } }}
      >
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          onClose={() => setShowReconnectedAlert(false)}
        >
          <Typography variant="body2" fontWeight="medium">
            Connection restored
          </Typography>
          <Typography variant="body2">
            You&apos;re back online. All features are now available.
          </Typography>
        </Alert>
      </Snackbar>

      {/* Offline Data Sync Alert */}
      <Snackbar
        open={showOfflineDataAlert}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: 90, sm: 24 } }}
      >
        <Alert
          severity="info"
          icon={<SyncIcon />}
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton
                size="small"
                onClick={handleSyncOfflineData}
                color="primary"
              >
                <SyncIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setShowOfflineDataAlert(false)}
                color="inherit"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          }
        >
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Offline changes detected
            </Typography>
            <Typography variant="body2">
              You have unsaved changes from when you were offline. Click sync to
              save them to the server.
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConnectionStatusMonitor;
