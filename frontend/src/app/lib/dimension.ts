import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { DimEntryT, DimensionT, DimensionType } from "../../types/dimension";
import { AttributeT } from "@/types/attribute";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlDimensions = API_URL + "/dimensions";

//////////////////////////
// Dimensions //
//////////////////////////

export async function addDimension(
  dimension: DimensionT,
  dimEntries: DimEntryT[]
) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dimension, dim_entries: dimEntries }),
  };
  try {
    const response = await fetch(
      `${apiUrlDimensions}/teams/${dimension.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add dimension: " + responseData.detail);
    }
    return responseData as {
      newDimension: DimensionT;
      newDimEntries: DimEntryT[];
      newAttributes: AttributeT[];
    };
  } catch (error) {
    console.error("Failed to add dimension:", error);
    throw new Error("Failed to add dimension, please try again later");
  }
}

export async function getDimensions(dimType: DimensionType[], teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlDimensions}/teams/${teamId}?dim_types=${dimType.join(",")}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch shift dimensions: " + responseData.detail
      );
    }
    return responseData as {
      dimensions: DimensionT[];
      dimEntries: DimEntryT[];
    };
  } catch (error) {
    console.error("Failed to fetch shift dimensions:", error);
    throw new Error("Failed to fetch shift dimensions, please try again later");
  }
}

export async function updateDimension(updatedDimension: DimensionT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedDimension),
  };
  try {
    const response = await fetch(
      `${apiUrlDimensions}/${updatedDimension.id}/teams/${updatedDimension.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update dimension: " + responseData.detail);
    }
    return responseData as DimensionT;
  } catch (error) {
    console.error("Failed to update dimension:", error);
    throw new Error("Failed to update dimension, please try again later");
  }
}

export async function deleteDimension(dimensionId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlDimensions}/${dimensionId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete dimension: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete dimension:", error);
    throw new Error("Failed to delete dimension, please try again later");
  }
}
