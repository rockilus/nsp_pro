import { unstable_noStore as noStore } from "next/cache";
// Types
import { BreachT, toBreachT } from "@/types/breach";
// Env Vars
import { API_URL } from "./env";

const apiUrlBreach = API_URL + "/breaches";

//////////////////////////
// Breach //
//////////////////////////

export async function getBreaches(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlBreach}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch breaches: " + responseData.detail);
    }
    return responseData.map(toBreachT) as BreachT[];
  } catch (error) {
    console.error("Failed to fetch breaches:", error);
    throw new Error("Failed to fetch breaches, please try again later");
  }
}
