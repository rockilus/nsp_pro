import { unstable_noStore as noStore } from "next/cache";

const apiUrlTeam = process.env.NEXT_PUBLIC_API_URL + "/teams";

export async function getSelectedTeamId() {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include",
  };
  try {
    const response = await fetch(`${apiUrlTeam}/selected-team-id`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch selected team id: " + responseData.detail
      );
    }
    return responseData.selectedTeamId as string;
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    throw new Error("Failed to fetch selected team id, please try again later");
  }
}
