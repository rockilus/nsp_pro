import { unstable_noStore as noStore } from "next/cache";
// Types
import { ConstraintT, TemplateT } from "../../types/constraint";

const apiUrlConstraints = process.env.NEXT_PUBLIC_API_URL + "/constraints";
const apiUrlTemplates =
  process.env.NEXT_PUBLIC_API_URL + "/constraint-templates";

//////////////////////////
// Constraint //
//////////////////////////

export async function addConstraint(constraint: ConstraintT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(constraint),
  };
  try {
    const response = await fetch(
      `${apiUrlConstraints}/teams/${constraint.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add constraint: " + responseData.detail);
    }
    return responseData as ConstraintT;
  } catch (error) {
    console.error("Failed to add constraint:", error);
    throw new Error("Failed to add constraint, please try again later");
  }
}

export async function getConstraints(teamId: string) {
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
      `${apiUrlConstraints}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch constraints: " + responseData.detail);
    }
    return responseData as ConstraintT[];
  } catch (error) {
    console.error("Failed to fetch constraints:", error);
    throw new Error("Failed to fetch constraints, please try again later");
  }
}

export async function updateConstraint(updatedConstraint: ConstraintT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedConstraint),
  };
  try {
    const response = await fetch(
      `${apiUrlConstraints}/${updatedConstraint.id}/teams/${updatedConstraint.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update constraint: " + responseData.detail);
    }
    return responseData as ConstraintT;
  } catch (error) {
    console.error("Failed to update constraint:", error);
    throw new Error("Failed to update constraint, please try again later");
  }
}

export async function deleteConstraint(constraintId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlConstraints}/${constraintId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete constraint: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete constraint:", error);
    throw new Error("Failed to delete constraint, please try again later");
  }
}

//////////////////////////
// Constraint Template //
//////////////////////////

export async function getTemplates(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlTemplates}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch constraint templates: " + responseData.detail
      );
    }
    return responseData as TemplateT[];
  } catch (error) {
    console.error("Failed to fetch constraint templates:", error);
    throw new Error(
      "Failed to fetch constraint templates, please try again later"
    );
  }
}

//////////////////////////
// Constraint Tab Data //
//////////////////////////

export async function getConstraintsTabData(teamId: string) {
  try {
    const constraintsTabData = await Promise.all([
      getTemplates(teamId),
      getConstraints(teamId),
    ]);
    return {
      templates: constraintsTabData[0],
      constraints: constraintsTabData[1],
    };
  } catch (error) {
    console.error("Failed to fetch constraints tab data:", error);
    throw new Error(
      "Failed to fetch constraints tab data, please try again later"
    );
  }
}
