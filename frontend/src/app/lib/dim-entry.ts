import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { DimEntryT } from "@/types/dim-entry";
import { AttributeT } from "../../types/attribute";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlDimEntries = API_URL + "/dim-entries";

//////////////////////////
// DimEntries - DEPRECATED //
//////////////////////////
// These functions are deprecated and will be removed in a future version.
// Please use the new DimEntryApi class and useDimEntry hooks instead:
// - Import: import { DimEntryApi } from './api/dimEntryApi';
// - Import: import { useAddDimEntry, useUpdateDimEntry, useDeleteDimEntry } from '@/hooks/useDimEntry';

/**
 * @deprecated Use DimEntryApi.addDimEntry() or useAddDimEntry() hook instead
 */
export async function addDimEntry(dimEntry: DimEntryT, teamId: string) {
  console.warn(
    "⚠️ addDimEntry is deprecated. Please use DimEntryApi.addDimEntry() or useAddDimEntry() hook instead"
  );
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dimEntry),
  };
  try {
    const response = await fetch(
      `${apiUrlDimEntries}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add dim entry: " + responseData.detail);
    }
    return responseData as DimEntryT;
  } catch (error) {
    console.error("Failed to add dim entry:", error);
    throw new Error("Failed to add dim entry, please try again later");
  }
}

/**
 * @deprecated Use DimEntryApi.updateDimEntry() or useUpdateDimEntry() hook instead
 */
export async function updateDimEntry(
  updatedDimEntry: DimEntryT,
  teamId: string
) {
  console.warn(
    "⚠️ updateDimEntry is deprecated. Please use DimEntryApi.updateDimEntry() or useUpdateDimEntry() hook instead"
  );
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedDimEntry),
  };
  try {
    const response = await fetch(
      `${apiUrlDimEntries}/${updatedDimEntry.id}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update dim entry: " + responseData.detail);
    }
    return responseData as DimEntryT;
  } catch (error) {
    console.error("Failed to update dim entry:", error);
    throw new Error("Failed to update dim entry, please try again later");
  }
}

/**
 * @deprecated Use DimEntryApi.deleteDimEntry() or useDeleteDimEntry() hook instead
 */
export async function deleteDimEntry(dimEntryId: string, teamId: string) {
  console.warn(
    "⚠️ deleteDimEntry is deprecated. Please use DimEntryApi.deleteDimEntry() or useDeleteDimEntry() hook instead"
  );
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlDimEntries}/${dimEntryId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete dim entry: " + responseData.detail);
    }
    return responseData as AttributeT[];
  } catch (error) {
    console.error("Failed to delete dim entry:", error);
    throw new Error("Failed to delete dim entry, please try again later");
  }
}
