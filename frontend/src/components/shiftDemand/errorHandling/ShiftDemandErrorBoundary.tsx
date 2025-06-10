/**
 * Error boundary for shift demand grid components
 * Provides graceful error handling with user-friendly fallbacks
 */

"use client";

import React, { Component, ReactNode } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Stack,
  Collapse,
  IconButton,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon,
} from "@mui/icons-material";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

interface ShiftDemandErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showRetry?: boolean;
  showDetails?: boolean;
  level?: "component" | "page" | "critical";
}

export class ShiftDemandErrorBoundary extends Component<
  ShiftDemandErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ShiftDemandErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for monitoring
    console.error(
      "ShiftDemandErrorBoundary caught an error:",
      error,
      errorInfo
    );

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you would send this to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // TODO: Implement error reporting service integration
      // reportError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleToggleDetails = () => {
    this.setState((prev) => ({
      showDetails: !prev.showDetails,
    }));
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  getErrorSeverity() {
    const { level = "component" } = this.props;
    const { error } = this.state;

    if (level === "critical" || error?.name === "ChunkLoadError") {
      return "error";
    } else if (level === "page") {
      return "warning";
    }
    return "info";
  }

  getErrorMessage() {
    const { error } = this.state;
    const { level = "component" } = this.props;

    if (error?.name === "ChunkLoadError") {
      return "The application has been updated. Please refresh the page to continue.";
    }

    if (level === "critical") {
      return "A critical error occurred that prevents the application from functioning properly.";
    } else if (level === "page") {
      return "An error occurred while loading this page. Some features may not work correctly.";
    }

    return "An error occurred in this component. Please try refreshing or contact support if the problem persists.";
  }

  getActionButtons() {
    const { showRetry = true, level = "component" } = this.props;
    const { error } = this.state;

    const buttons = [];

    if (showRetry && level !== "critical") {
      buttons.push(
        <Button
          key="retry"
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={this.handleRetry}
          color="primary"
        >
          Try Again
        </Button>
      );
    }

    if (error?.name === "ChunkLoadError" || level === "critical") {
      buttons.push(
        <Button
          key="refresh"
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
          color="primary"
        >
          Refresh Page
        </Button>
      );
    }

    if (level === "page" || level === "critical") {
      buttons.push(
        <Button
          key="home"
          variant="outlined"
          startIcon={<HomeIcon />}
          onClick={this.handleGoHome}
        >
          Go to Home
        </Button>
      );
    }

    return buttons;
  }

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const {
      children,
      fallback,
      showDetails: showDetailsOption = true,
    } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const severity = this.getErrorSeverity();
      const message = this.getErrorMessage();
      const actionButtons = this.getActionButtons();

      return (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            m: 2,
            maxWidth: 800,
            mx: "auto",
          }}
        >
          <Alert severity={severity} icon={<BugReportIcon />}>
            <AlertTitle>
              Something went wrong
              {showDetailsOption && (
                <IconButton
                  size="small"
                  onClick={this.handleToggleDetails}
                  sx={{ ml: 1 }}
                  aria-label={showDetails ? "Hide details" : "Show details"}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: showDetails
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s",
                    }}
                  />
                </IconButton>
              )}
            </AlertTitle>

            <Typography variant="body2" sx={{ mb: 2 }}>
              {message}
            </Typography>

            {actionButtons.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {actionButtons}
              </Stack>
            )}

            {showDetailsOption && (
              <Collapse in={showDetails}>
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    backgroundColor: "grey.100",
                    borderRadius: 1,
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details:
                  </Typography>
                  <Typography variant="body2" component="pre">
                    {error?.toString()}
                  </Typography>

                  {errorInfo?.componentStack && (
                    <>
                      <Typography
                        variant="subtitle2"
                        sx={{ mt: 2 }}
                        gutterBottom
                      >
                        Component Stack:
                      </Typography>
                      <Typography variant="body2" component="pre">
                        {errorInfo.componentStack}
                      </Typography>
                    </>
                  )}
                </Box>
              </Collapse>
            )}
          </Alert>
        </Paper>
      );
    }

    return children;
  }
}

// Functional wrapper for easier use with hooks
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  level?: "component" | "page" | "critical";
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  level = "component",
}) => {
  return (
    <ShiftDemandErrorBoundary
      fallback={
        <Paper elevation={2} sx={{ p: 2, m: 1 }}>
          <Alert severity="error">
            <AlertTitle>Error in component</AlertTitle>
            <Typography variant="body2" gutterBottom>
              {error.message}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={resetError}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          </Alert>
        </Paper>
      }
      level={level}
      showRetry={true}
      onError={(err, errorInfo) => {
        console.error("Component error:", err, errorInfo);
      }}
    >
      {null}
    </ShiftDemandErrorBoundary>
  );
};

export default ShiftDemandErrorBoundary;
