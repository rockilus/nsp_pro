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
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to export schedule: " + responseData.detail);
    }
    return responseData;
  } catch (error) {
    console.error("Failed to export schedule:", error);
    throw new Error("Failed to export schedule, please try again later");
  }
}
