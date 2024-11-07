// Types
import { ExportOptionsT } from "../../types/schedule";
// Env Vars
import { API_URL } from "./env";

const apiUrlExportSchedule = API_URL + "/export";

export const fromExportOptionsT = (data: ExportOptionsT): any => {
  return {
    ...data,
    startDate: data.startDate.unix(),
    endDate: data.endDate.unix(),
  };
};

//////////////////////////
// Export Schedule //
//////////////////////////

export async function exportSchedule(
  teamId: string,
  exportOptions: ExportOptionsT
) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromExportOptionsT(exportOptions)),
  };
  try {
    const response = await fetch(
      `${apiUrlExportSchedule}/teams/${teamId}`,
      options
    );
    if (!response.ok) {
      const responseData = await response.json();
      throw new Error("Failed to export schedule: " + responseData.detail);
    }

    // Fetch the response as a blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Create a link element and trigger a download
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule_${teamId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export schedule:", error);
    throw new Error("Failed to export schedule, please try again later");
  }
}
