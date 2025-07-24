/**
 * API client for export operations
 */

import { ExportOptionsT, fromExportOptionsT } from "../../../types/schedule";
import { API_URL } from "../env";

export class ExportApi {
  private static readonly baseUrl = API_URL;

  /**
   * Export schedule to Excel file (authenticated)
   */
  static async exportSchedule(
    authToken: string,
    teamId: string,
    exportOptions: ExportOptionsT
  ): Promise<Blob> {
    // Security: Input validation
    if (!authToken) {
      throw new Error("Authentication token is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!exportOptions || !exportOptions.startDate || !exportOptions.endDate) {
      throw new Error("Invalid export options provided");
    }

    try {
      const response = await fetch(`${this.baseUrl}/export/teams/${teamId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(fromExportOptionsT(exportOptions)),
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to export schedule: ${
            responseData.detail || response.statusText
          }`
        );
      }

      return await response.blob();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(`❌ Export request failed:`, {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Download blob as file
   */
  static downloadBlob(blob: Blob, filename: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download file:", error);
      throw new Error("Failed to download file");
    }
  }
}
