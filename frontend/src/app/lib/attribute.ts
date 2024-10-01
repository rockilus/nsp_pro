// Types
import { AttributeT } from "../../types/shift";
// Env Vars
import { API_URL } from "./env";

const apiUrlShifts = API_URL + "/attributes";

//////////////////////////
// Attributes //
//////////////////////////

export async function updateAttribute(attribute: AttributeT, teamId: string) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(attribute),
  };
  try {
    const response = await fetch(`${apiUrlShifts}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update attribute: " + responseData.detail);
    }
    return responseData as AttributeT;
  } catch (error) {
    console.error("Failed to update attribute:", error);
    throw new Error("Failed to update attribute, please try again later");
  }
}
