import { getCookie } from "../utils/cookie";

const serverUrl = "http://127.0.0.1:5000";

// ConstraintParam
const getContraintParamsUrl = serverUrl + "/constraint-params";

// Constraint
const createConstraintUrl = serverUrl + "/constraints";
const getConstraintsUrl = serverUrl + "/constraints";
const updateConstraintUrl = serverUrl + "/constraints";
const updateConstraintStatusUrl = (constraintId: string) => `${serverUrl}/constraints/${constraintId}/status`;
const deleteConstraintUrl = (constraintId: string) => `${serverUrl}/constraints/${constraintId}`;

// ConstraintParam
export async function serverGetConstraintParams() {
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
  });

  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: headers,
  };

  try {
    const response = await fetch(getContraintParamsUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Constraint
export async function serverPostCreateConstraint(
  constraint: Record<string, unknown>
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(constraint),
  };
  try {
    const response = await fetch(createConstraintUrl, options);
    if (response.ok) {
      const jsonData = await response.json();

      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function serverGetConstraints() {
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
  });

  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: headers,
  };

  try {
    const response = await fetch(getConstraintsUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function serverPostUpdateConstraint(
  constraintId: string,
  constraint: Record<string, unknown>
) {
  const options: RequestInit = {
    method: "PUT",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      constraint_id: constraintId,
      constraint: constraint,
    }),
  };
  try {
    const response = await fetch(updateConstraintUrl, options);
    if (response.ok) {
      const jsonData = await response.json();

      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function serverPostUpdateConstraintStatus(
  constraintId: string,
  active: boolean
) {
  const options: RequestInit = {
    method: "PUT",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      constraint_id: constraintId,
      active: active,
    }),
  };
  try {
    const response = await fetch(updateConstraintStatusUrl(constraintId), options);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function serverDeleteConstraint(constraintId: string) {
  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      constraint_id: constraintId,
    }),
  };
  try {
    const response = await fetch(deleteConstraintUrl(constraintId), options);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}
