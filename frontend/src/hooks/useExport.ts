import { useCallback } from "react";
// Types
import { ExportOptionsT } from "../types/schedule";
// API Client
import { ExportApi } from "../app/lib/api/exportApi";
// Auth Context
import { useAuth } from "../contexts/auth-context";

//////////////////////////
// Authenticated Export Hooks //
//////////////////////////

/**
 * Hook for exporting schedule to Excel
 */
export function useExportSchedule() {
  const { user, isAuthenticated, loading } = useAuth();

  const exportSchedule = useCallback(
    async (teamId: string, exportOptions: ExportOptionsT): Promise<void> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useExportSchedule called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          exportOptions: {
            periodOption: exportOptions.periodOption,
            startDate: exportOptions.startDate.format("YYYY-MM-DD"),
            endDate: exportOptions.endDate.format("YYYY-MM-DD"),
          },
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      // Input validation
      if (!teamId || teamId.trim().length === 0) {
        throw new Error("Team ID is required");
      }

      if (
        !exportOptions ||
        !exportOptions.startDate ||
        !exportOptions.endDate
      ) {
        throw new Error("Invalid export options provided");
      }

      try {
        const blob = await ExportApi.exportSchedule(
          user.id_token,
          teamId.trim(),
          exportOptions
        );

        // Generate filename with timestamp
        const filename = `schedule_${teamId}_${exportOptions.startDate.format(
          "YYYY-MM-DD"
        )}_to_${exportOptions.endDate.format("YYYY-MM-DD")}.xlsx`;

        ExportApi.downloadBlob(blob, filename);

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Schedule exported successfully");
        }
      } catch (error) {
        console.error("❌ Failed to export schedule:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [isAuthenticated, loading, user]
  );

  return exportSchedule;
}

/**
 * Hook for exporting schedule and getting the blob (for custom handling)
 */
export function useExportScheduleBlob() {
  const { user, isAuthenticated, loading } = useAuth();

  const exportScheduleBlob = useCallback(
    async (teamId: string, exportOptions: ExportOptionsT): Promise<Blob> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useExportScheduleBlob called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      // Input validation
      if (!teamId || teamId.trim().length === 0) {
        throw new Error("Team ID is required");
      }

      if (
        !exportOptions ||
        !exportOptions.startDate ||
        !exportOptions.endDate
      ) {
        throw new Error("Invalid export options provided");
      }

      try {
        return await ExportApi.exportSchedule(
          user.id_token,
          teamId.trim(),
          exportOptions
        );
      } catch (error) {
        console.error("❌ Failed to export schedule blob:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [isAuthenticated, loading, user]
  );

  return exportScheduleBlob;
}
