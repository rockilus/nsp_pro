"use client";

import React from "react";
import { useAuth } from "../../../contexts/auth-context";
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Paper,
} from "@mui/material";
import ProtectedRoute from "../../../components/auth/protected-route";
import { AuthTestComponent } from "../../../components/debug/auth-test-component";
import { AuthDebugComponent } from "../../../components/debug/auth-debug-component";

export default function AuthTestPage() {
  const { user, isAuthenticated, accessToken, signOut, signOutRedirect } =
    useAuth();

  return (
    <ProtectedRoute>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Authentication Test Page
        </Typography>

        <Stack spacing={3}>
          {/* New API Test Component */}
          <AuthTestComponent />

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Authentication Status
              </Typography>
              <Chip
                label={isAuthenticated ? "Authenticated" : "Not Authenticated"}
                color={isAuthenticated ? "success" : "error"}
                variant="filled"
              />
            </CardContent>
          </Card>

          {user && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Information
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    bgcolor: "grey.100",
                    p: 2,
                    borderRadius: 1,
                    overflow: "auto",
                    fontSize: "0.875rem",
                  }}
                >
                  {JSON.stringify(user.profile, null, 2)}
                </Box>
              </CardContent>
            </Card>
          )}

          {user?.id_token && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ID Token (First 50 characters)
                </Typography>
                <Paper
                  sx={{ p: 2, bgcolor: "grey.50", fontFamily: "monospace" }}
                >
                  {user.id_token.substring(0, 50)}...
                </Paper>
                <Typography
                  variant="body2"
                  sx={{ mt: 1, color: "text.secondary" }}
                >
                  Length: {user.id_token.length} characters
                </Typography>
              </CardContent>
            </Card>
          )}

          {accessToken && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Access Token (First 50 characters)
                </Typography>
                <Paper
                  sx={{ p: 2, bgcolor: "grey.50", fontFamily: "monospace" }}
                >
                  {accessToken.substring(0, 50)}...
                </Paper>
              </CardContent>
            </Card>
          )}

          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="secondary" onClick={signOut}>
              Sign Out (Client)
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={signOutRedirect}
            >
              Sign Out (Redirect)
            </Button>
          </Stack>
        </Stack>
      </Container>

      {/* Debug Component - only shows in development */}
      <AuthDebugComponent />
    </ProtectedRoute>
  );
}
