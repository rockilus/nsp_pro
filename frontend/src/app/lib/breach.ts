import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { BreachT } from "@/types/breach";
import { VariableT } from "@/types/breach";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlBreach = API_URL + "/breaches";

export const toBreachT = (data: any): BreachT => {
  return {
    ...data,
    variables: data.variables.map((variable: any) => {
      const variableT: VariableT = {
        ...variable,
        date: dayjs.utc(variable.date),
      };
      return variableT;
    }),
  };
};

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
