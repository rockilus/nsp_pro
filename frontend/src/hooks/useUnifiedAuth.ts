/**
 * Unified authentication hook that works in both development and production
 */

import { isDevelopment } from "../config/env";

// Mock the useAuth hook structure for development
interface AuthContextType {
  user?: {
    id_token?: string | null;
    profile?: {
      sub?: string;
      email?: string;
      name?: string;
    };
  } | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export function useUnifiedAuth(): AuthContextType {
  if (isDevelopment()) {
    // Development mode: return mock auth state
    return {
      user: null, // No user object needed in development
      isAuthenticated: true, // Always authenticated in development
      loading: false, // Never loading in development
    };
  }

  // Production mode: use actual auth context
  // This will be handled by the auth provider wrapping
  try {
    // Dynamic import to avoid issues when auth context is not available
    const { useAuth } = require("../contexts/auth-context");
    return useAuth();
  } catch (error) {
    // Fallback if auth context is not available
    return {
      user: null,
      isAuthenticated: false,
      loading: false,
    };
  }
}
