"use client";

import React, { useState, useCallback } from "react";
import { useGetUser } from "../../app/lib/user";
import { useAuth } from "../../contexts/auth-context";
import { StaticAuthGuard } from "../auth/static-auth-guard";

export function AuthTestComponent() {
  const { isAuthenticated, user, loading } = useAuth();
  const getUser = useGetUser();
  const [testResult, setTestResult] = useState<string>("");

  // Use useCallback to prevent unnecessary re-renders
  const handleTestAuth = useCallback(async () => {
    try {
      setTestResult("Testing...");
      const userData = await getUser();
      setTestResult(`✅ Success: User ${userData.id} fetched`);
    } catch (error) {
      setTestResult(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, [getUser]);

  return (
    <StaticAuthGuard>
      <div
        style={{
          padding: "20px",
          border: "1px solid #ccc",
          margin: "20px",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
        }}
      >
        <h3>Authentication Test</h3>
        <div>
          Status:{" "}
          {loading
            ? "🔄 Loading"
            : isAuthenticated
            ? "✅ Authenticated"
            : "❌ Not authenticated"}
        </div>
        <div>User: {user ? "✅ Present" : "❌ Missing"}</div>
        <div>ID Token: {user?.id_token ? "✅ Present" : "❌ Missing"}</div>
        <div>Token Length: {user?.id_token?.length || 0}</div>
        <button
          onClick={handleTestAuth}
          style={{
            margin: "10px 0",
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Test API Call
        </button>
        <div
          style={{
            marginTop: "10px",
            padding: "10px",
            backgroundColor: testResult.includes("✅")
              ? "#d4edda"
              : testResult.includes("❌")
              ? "#f8d7da"
              : "#fff3cd",
            borderRadius: "4px",
            border: testResult.includes("✅")
              ? "1px solid #c3e6cb"
              : testResult.includes("❌")
              ? "1px solid #f5c6cb"
              : "1px solid #ffeaa7",
          }}
        >
          Result: {testResult || 'Click "Test API Call" to test authentication'}
        </div>
      </div>
    </StaticAuthGuard>
  );
}
