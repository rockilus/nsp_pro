/**
 * API client for export operations
 */

import { ExportOptionsT, fromExportOptionsT } from "../../../types/schedule";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class ExportApi extends BaseApi {
  /**
   * Export schedule to Excel file (authenticated)
   */
  static async exportSchedule(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    exportOptions: ExportOptionsT,
  ): Promise<Blob> {
    // Security: Input validation
    if (!apiClient) {
      throw new Error("API client is required for authenticated requests");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!exportOptions || !exportOptions.startDate || !exportOptions.endDate) {
      throw new Error("Invalid export options provided");
    }

    return await this.makeBlobRequest(
      apiClient,
      "post",
      `/export/teams/${teamId}`,
      fromExportOptionsT(exportOptions),
    );
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
